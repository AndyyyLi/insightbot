import {InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import {parse} from "parse5";
import {Room} from "./Room";
import {get} from "http";
export class DatasetSectionRoom {
	private unzippedContents: JSZip | null;
	constructor() {
		this.unzippedContents = null;
	}

	public handleDatasetRoom(content: string): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>((resolve, reject) => {
			this.extractBuildingRowsFromContent(content, reject)
				.then((buildingRowsHTML) => resolve(this.processRoomFiles(buildingRowsHTML, reject)));
		});
	}

	private async processRoomFiles(buildingRowsHTML: object, reject: (reason?: any) => void): Promise<InsightResult[]> {
		const buildingRowsPromises: Array<Promise<[any | null, any[] | null, [number, number] | null]>> = [];
		for (const buildingRow of buildingRowsHTML as object[]) {
			buildingRowsPromises.push(this.extractRoomRowFromBuildingRows(buildingRow as any));
		}
		const buildingRowsResults = await Promise.all(buildingRowsPromises);
		const validBuildingRows: Array<[any, any[], [number, number]]> = buildingRowsResults.filter(
			([_, textResult]) => textResult !== null) as Array<[any, any[], [number, number]]>;
		if (validBuildingRows.length === 0) {
			reject(new InsightError("No valid buildings or tables"));
		}
		let roomParser = new Room();
		return roomParser.buildRoomsArray(validBuildingRows);
	}

	private async extractRoomRowFromBuildingRows(buildingRow: any): Promise<[any, any, any]> {
		const titleLink = this.extractLinkFromColumnWithClass(buildingRow, "views-field views-field-title");
		const nothingLink = this.extractLinkFromColumnWithClass(buildingRow, "views-field views-field-nothing");
		const addressValue = this.extractValueFromColumnWithClass(buildingRow,
			"views-field views-field-field-building-address");
		if (titleLink && this.unzippedContents && addressValue) {
			const titleResult = await this.retrieveRoomTextFromLink(titleLink) as unknown;
			if (titleResult) {
				const validRoomTable = await this.extractRoomElements(titleResult as string);
				const roomRows = validRoomTable[0] ? await this.extractRoomRows(validRoomTable[0]) : null;
				const geoLocation = await this.getGeoLocation(addressValue);
				if (geoLocation[0] !== null && geoLocation[1] !== null) {
					return [buildingRow, roomRows, geoLocation];
				}
			}
		} else if (nothingLink && this.unzippedContents && addressValue) {
			const nothingResult = await this.retrieveRoomTextFromLink(nothingLink) as unknown;
			if (nothingResult) {
				const validRoomTable = await this.extractRoomElements(nothingResult as string);
				const roomRows = validRoomTable[0] ? await this.extractRoomRows(validRoomTable[0]) : null;
				const geoLocation = await this.getGeoLocation(addressValue);
				if (geoLocation[0] !== null && geoLocation[1] !== null) {
					return [buildingRow, roomRows, geoLocation];
				}
			}
		}
		return [null, null, null];
	}

	private getGeoLocation(address: string): Promise<[number | null, number | null]> {
		const url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team153/" + encodeURI(address);
		return new Promise<[number | null, number | null]>((resolve) => {
			get(url, (result: {on: (arg0: string, arg1: (chunk: any) => void) => void;}) => {
				let data = "";
				result.on("data", (chunk) => {
					data += chunk;
				});
				result.on("end", () => {
					try {
						const geolocation = JSON.parse(data);
						if (geolocation.error) {
							resolve([null , null]);
						} else {
							resolve([geolocation.lat, geolocation.lon]);
						}
					} catch (e) {
						resolve([null, null]);
					}
				});
			}).on("error", (err: any) => {
				resolve([null, null]);
			});
		});
	}

	private extractValueFromColumnWithClass(trElement: any, className: string): string | null {
		if (trElement.nodeName === "tr" && trElement.childNodes) {
			const tdWithClass = this.findTdByClass(trElement, className);
			if (tdWithClass && tdWithClass.childNodes) {
				for (const childNode of tdWithClass.childNodes) {
					if (childNode.nodeName === "#text") { // Check if it's a text node
						return childNode.value.trim();
					}
				}
			}
		}
		return null;
	}

	private async retrieveRoomTextFromLink(link: string | null): Promise<string | null> {
		if (link && this.unzippedContents) {
			const matchingFiles = Object.keys(this.unzippedContents.files).filter(
				(fileName) => link.endsWith(fileName)
			);
			if (matchingFiles.length > 0) {
				const result = await this.unzippedContents.files[matchingFiles[0]].async("text").catch(() => null);
				return result;
			}
		}
		return null;
	}

	private extractRoomRows(roomTableElement: any): any {
		if (roomTableElement.nodeName === "tbody") {
			if (roomTableElement.childNodes) {
				const childNodesArray = Array.from(roomTableElement.childNodes) as any[];
				return childNodesArray.filter((childNode) => childNode.nodeName === "tr");
			}
			return [];
		}
		if (roomTableElement.childNodes) {
			const childPromises = Array.from(roomTableElement.childNodes).map((childNode) => {
				return this.extractRoomRows(childNode as any);
			});
			return Promise.all(childPromises).then((rows) => rows.flat());
		}
		return [];
	}

	private async extractRoomElements(buildingText: string) {
		const buildingHTML = parse(buildingText) as unknown;
		return await this.extractRoomTable(buildingHTML as any);
	}

	private async extractRoomTable(buildingHTML: any): Promise<any> {
		if (buildingHTML.nodeName === "table") {
			if(this.isValidRoomTable(buildingHTML)) {
				return buildingHTML;
			}
		}
		if (buildingHTML.childNodes) {
			const childPromises = Array.from(buildingHTML.childNodes).map((childNode) => {
				return this.extractRoomTable(childNode);
			});
			return Promise.all(childPromises).then((rows) => rows.flat());
		}
		return [];
	}

	private isValidRoomTable(table: any): boolean {
		if (table.nodeName === "table" && table.childNodes) {
			const thNodes = this.getThNodesFromTable(table);
			const desiredColumns = [
				"views-field views-field-field-room-number", "views-field views-field-field-room-capacity",
				"views-field views-field-field-room-furniture", "views-field views-field-field-room-type",
			];
			return thNodes.every((thNode) => this.hasDesiredColumns(thNode, desiredColumns));
		}
		return false;
	}

	private extractLinkFromColumnWithClass(trElement: any, className: string): string | null {
		if (trElement.nodeName === "tr" && trElement.childNodes) {
			const tdWithLink = this.findTdByClass(trElement, className);
			if (tdWithLink) {
				const linkElement = this.findChildByTag(tdWithLink, "a");
				if (linkElement && linkElement.attrs) {
					const hrefAttribute = linkElement.attrs.find((attr: {name: string;}) => attr.name === "href");
					return hrefAttribute ? hrefAttribute.value : null;
				}
			}
		}
		return null;
	}

	private findTdByClass(element: any, className: string): any {
		if (element.tagName === "td" && element.attrs &&
			element.attrs.some((attr: {name: string, value: string;}) =>
				attr.name === "class" && attr.value === className)) {
			return element;
		}
		for (const child of element.childNodes) {
			if (child.tagName) {
				const result = this.findTdByClass(child, className);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	private findChildByTag(element: any, tag: string): any {
		for (const child of element.childNodes) {
			if (child.tagName === tag) {
				return child;
			}
		}
		return null;
	}

	private extractBuildingRowsFromContent(content: string, reject: (reason?: any) => void): Promise<object> {
		let zip = new JSZip();
		return zip.loadAsync(content, {base64:true}).then((contents) => {
			this.unzippedContents = contents;
			const indexPromise = Object.keys(contents.files).map(async (filename) => {
				if (filename.endsWith("index.htm")) {
					const indexText = await contents.files[filename].async("text").catch();
					return this.extractIndexElements(indexText);
				}
			});
			return Promise.all(indexPromise);
		}).then((extractedElements) => {
			const validTableHTML = extractedElements.filter((element) => !!element);
			if (validTableHTML.length !== 1) {
				reject(new InsightError("No valid building table in index.htm or invalid index.htm"));
			}
			return this.extractBuildingRows(validTableHTML[0]);
		}).then((extractedRows) => {
			const buildingRows = extractedRows.filter((element: any ) => !!element);
			return buildingRows;
		}).catch((error) => {
			reject(new InsightError("Failed to extract building table from zip file" + error));
		});
	}

	private extractBuildingRows(buildingTableElement: any): any {
		if (buildingTableElement.nodeName === "tbody") {
			if (buildingTableElement.childNodes) {
				const childNodesArray = Array.from(buildingTableElement.childNodes) as any[];
				return childNodesArray.filter((childNode) => childNode.nodeName === "tr");
			}
			return [];
		}
		if (buildingTableElement.childNodes) {
			const childPromises = Array.from(buildingTableElement.childNodes).map((childNode) => {
				return this.extractBuildingRows(childNode as any);
			});
			return Promise.all(childPromises).then((rows) => rows.flat());
		}
		return [];
	}

	private extractIndexElements(htmlText: string): any {
		const htmlDocument = parse(htmlText) as unknown;
		return this.extractBuildingTable(htmlDocument as any);
	}

	private async extractBuildingTable(html: any): Promise<any> {
		if (html.nodeName === "table") {
			if(this.isValidBuildingTable(html)) {
				return html;
			}
		}
		if (html.childNodes) {
			const childPromises = Array.from(html.childNodes).map((childNode) => {
				return this.extractBuildingTable(childNode);
			});
			return Promise.all(childPromises).then((tables) =>
				tables.find((table) =>
					table !== "") || "");
		}
		return "";
	}

	private isValidBuildingTable(table: any): boolean {
		if (table.nodeName === "table" && table.childNodes) {
			const thNodes = this.getThNodesFromTable(table);
			const desiredColumns = ["views-field views-field-field-building-image",
				"views-field views-field-field-building-code", "views-field views-field-title",
				"views-field views-field-field-building-address", "views-field views-field-nothing"];
			return thNodes.every((thNode) => this.hasDesiredColumns(thNode, desiredColumns));
		}
		return false;
	}

	private hasDesiredColumns(thNode: any, desiredColumns: string[]): boolean {
		const node = thNode as any;
		return ((node.attrs && node.attrs.some(({name, value}: {name: string; value: string}) =>
			name === "class" && desiredColumns.some((column) => value.includes(column.trim())))) || true);
	}

	private getThNodesFromTable(table: any): any[] {
		const theadElement = Array.from(table.childNodes).find(
			(node: any) => node.nodeName === "thead") as any;
		if (theadElement && theadElement.childNodes) {
			const trElement = Array.from(theadElement.childNodes).find((node: any) => node.nodeName === "tr") as any;
			if (trElement && trElement.childNodes) {
				return Array.from(trElement.childNodes).filter((node: any) => node.nodeName === "th");
			}
		}
		return [];
	}
}
