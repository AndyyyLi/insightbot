import {InsightResult} from "./IInsightFacade";

export class Room {
	constructor() {
		//
	}

	public buildRoomsArray(validBuildingsAndRooms: Array<[Node, Node[], [number, number]]>): InsightResult[] {
		let roomsArray: InsightResult[] = [];
		for (const buildingRoomGeolocation of validBuildingsAndRooms) {
			const buildingRow = buildingRoomGeolocation[0];
			const roomRow = buildingRoomGeolocation[1];
			const geolocation = buildingRoomGeolocation[2];

			for (const room of roomRow) {
				const fullnameValue = String(this.extractDeepValueFromColumnWithClass(buildingRow,
					"views-field views-field-title"));
				const shortnameValue = String(this.extractValueFromColumnWithClass(buildingRow,
					"views-field views-field-field-building-code"));
				const numberValue = String(this.extractDeepValueFromColumnWithClass(room,
					"views-field views-field-field-room-number"));
				const addressValue = String(this.extractValueFromColumnWithClass(buildingRow,
					"views-field views-field-field-building-address"));
				const latValue = geolocation[0];
				const lonValue = geolocation[1];
				const seatValue = String(this.extractValueFromColumnWithClass(room,
					"views-field views-field-field-room-capacity"));
				const typeValue = String(this.extractValueFromColumnWithClass(room,
					"views-field views-field-field-room-type"));
				const furnitureValue = String(this.extractValueFromColumnWithClass(room,
					"views-field views-field-field-room-furniture"));
				let hrefValue = String(this.extractLinkFromColumnWithClass(buildingRow,
					"views-field views-field-title"));
				if (!hrefValue) {
					hrefValue = String(this.extractValueFromColumnWithClass(buildingRow,
						"views-field views-field-nothing"));
				}

				if (fullnameValue && shortnameValue && numberValue && addressValue && latValue && lonValue && seatValue
					&& typeValue && furnitureValue && hrefValue) {
					const roomResult = this.parse(fullnameValue, shortnameValue, numberValue, addressValue, latValue,
						lonValue, seatValue, typeValue, furnitureValue, hrefValue);
					roomsArray.push(roomResult);
				}
			}
		}
		return roomsArray;
	}

	private parse(fullnameValue: string, shortnameValue: string, numberValue: string, addressValue: string,
		latValue: number, lonValue: number, seatValue: string, typeValue: string, furnitureValue: string,
		hrefValue: string): InsightResult {
		const nameValue = shortnameValue + "_" + numberValue;
		const roomResult: InsightResult = {
			fullname: fullnameValue,
			shortname: shortnameValue,
			number: numberValue,
			name: nameValue,
			address: addressValue,
			lat: latValue,
			lon: lonValue,
			seat: Number(seatValue),
			type: typeValue,
			furniture: furnitureValue,
			href: hrefValue
		};
		return roomResult;
	}

	private extractDeepValueFromColumnWithClass(trElement: Node, className: string): string | null {
		if (trElement.nodeName === "tr" && trElement.childNodes) {
			const tdWithClass = this.findTdByClass(trElement, className);
			if (tdWithClass) {
				const element = this.findChildByTag(tdWithClass, "a");
				if (element) {
					for (const childNode of element.childNodes) {
						if (childNode.nodeName === "#text") { // Check if it's a text node
							return childNode.value.trim();
						}
					}
				}
			}
		}
		return null;
	}

	private extractLinkFromColumnWithClass(trElement: Node, className: string): string | null {
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

	private findChildByTag(element: any, tag: string): any {
		for (const child of element.childNodes) {
			if (child.tagName === tag) {
				return child;
			}
		}
		return null;
	}

	private extractValueFromColumnWithClass(trElement: Node, className: string): string | null {
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
}
