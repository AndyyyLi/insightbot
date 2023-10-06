import JSZip from "jszip";
import fs from "fs-extra";
import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import {Section} from "./Section";
const PROJECT_ROOT = path.join(__dirname, "../..");
const DATA_FOLDER_PATH = path.join(PROJECT_ROOT, "data");

import QueryEngine from "./QueryEngine";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

	private currentDatasets: string[];
  	private queryEngine: QueryEngine;
	private datasetsMap: Map<string, InsightResult[]>;

	constructor() {
		this.currentDatasets = [];
    	this.queryEngine = new QueryEngine();
		this.datasetsMap = new Map<string, InsightResult[]>();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>( (resolve, reject) => {
			if (id && content && kind) {
				if (id === "" || id.includes("_") || this.currentDatasets.includes(id)) {
					reject(new InsightError("Trying to add datatset with an invalid ID, or one with a duplicate ID"));
				}

				if (kind === InsightDatasetKind.Rooms) {
					reject(new InsightError("Trying to add dataset with Rooms kind"));
				}

				const courseFilesPromise = this.extractCourseFiles(content, reject);
				courseFilesPromise.then((courseFiles) => {
					const sectionsArrayPromise = this.processCourseFiles(courseFiles, reject);
					sectionsArrayPromise.then((sectionsArray) => {
						if (sectionsArray.length === 0) {
							reject(new InsightError("Trying to add dataset with no valid sections in course file"));
						}
						this.saveToDisk(id, sectionsArray, reject).then((r) => {
							this.currentDatasets.push(id);
							this.datasetsMap.set(id, sectionsArray);
							resolve(this.currentDatasets);
						});
					});
				});
			} else {
				reject(new InsightError("Trying to add a dataset with invalid parameters"));
			}
		});
	}

	// Saves the desired InsightResult[] to disk
	private async saveToDisk(id: string, sections: InsightResult[], reject: (reason?: any) => void) {
		try {
			await fs.mkdir(DATA_FOLDER_PATH, {recursive: true});

			const filePath = path.join(DATA_FOLDER_PATH, id + ".json");
			await fs.writeFile(filePath, JSON.stringify(sections, null, 2));
		} catch (error: any) {
			reject(new InsightError("Failed to save dataset to disk: " + error.message));
		}
	}

	// Takes the JSON course files and parses them into desired InsightResult[]
	private processCourseFiles(jsonCourseFiles: string[], reject: (reason?: any) => void): Promise<InsightResult[]> {
		const sectionsArray: InsightResult[] = [];
		const promises = jsonCourseFiles.map((jsonCourseFile) => {
			return new Promise<void>((resolve) => {
				try {
					const courseFile = JSON.parse(jsonCourseFile);
					let courseFileKeys = Object.keys(courseFile);
					if (courseFileKeys.length === 2 && courseFileKeys[0] === "result" && courseFileKeys[1] === "rank") {
						if (courseFile.result && Array.isArray(courseFile.result)) {
							for (const section of courseFile.result) {
								let sectionParser = new Section();
								if (sectionParser.validSection(section)) {
									const parsedSection = sectionParser.parse(section);
									if (parsedSection) {
										sectionsArray.push(parsedSection);
									}
								}
							}
							resolve();
						} else {
							reject(new InsightError("JSON file does not include a 'result' key"));
						}
					} else {
						reject(new InsightError("JSON file does not have correct course format"));
					}
				} catch (e) {
					reject(new InsightError("JSON file could not be parsed"));
				}
			});
		});
		return Promise.all(promises)
			.then(() => sectionsArray)
			.catch((error) => {
				reject(error);
				return [];
			});
	}

	// Unzips the content and tries to convert all JSON files in the courses folder into a parsable text
	private extractCourseFiles(content: string, reject: (reason?: any) => void): Promise<string[]> {
		let zip = new JSZip();
		const courseFiles: Array<Promise<string>> = [];
		return zip.loadAsync(content, {base64: true}).then((contents) => {
			const coursesFolder = contents.folder("courses");
			if ("courses/" in contents.files && coursesFolder && coursesFolder.files) {
				Object.keys(coursesFolder.files).forEach((filename) => {
					try {
						if (filename !== "courses/") {
							let courseFile = coursesFolder.files[filename];
							courseFiles.push(courseFile.async("text"));
						}
					} catch (e) {
						reject(new InsightError("Trying to add dataset with non-JSON file"));
					}
				});
			} else {
				reject(new InsightError("Trying to add dataset with no courses folder"));
			}
			return Promise.all(courseFiles);
		})
			.catch((error) => {
				reject(new InsightError("Trying to add dataset with content that cannot be unzipped"));
				return [];
			});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			if (id === "" || id.includes("_")) {
				reject(new InsightError("Trying to remove dataset with an invalid ID"));
			}

			if (!this.currentDatasets.includes(id)) {
				reject(new NotFoundError("Trying to remove dataset that has not been added"));
			}

			const filePath = path.join(DATA_FOLDER_PATH, id + ".json");
			fs.remove(filePath).then(() => {
				this.currentDatasets = this.currentDatasets.filter((datasetID) => datasetID !== id);
				this.datasetsMap.delete(id);
				resolve(id);
			}).catch(() => {
				reject(new NotFoundError("Trying to remove dataset with unknown file path"));
			});
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			try {
				this.queryEngine.checkNewQuery(query);
				this.queryEngine.checkWhere();
				this.queryEngine.checkOptions();
				resolve(this.queryEngine.executeQuery(this.datasetsMap));
			} catch (err) {
				if (err === ResultTooLargeError) {
					reject(ResultTooLargeError);
				} else {
					reject(InsightError);
				}
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise<InsightDataset[]>((resolve) => {
			let datasetsList: InsightDataset[] = [];
			for(const key of this.datasetsMap.keys()) {
				const dataset = this.datasetsMap.get(key);
				if (dataset) {
					const currInsightDataset: InsightDataset = {
						id: key,
						kind: InsightDatasetKind.Sections,
						numRows: dataset.length
					};
					datasetsList.push(currInsightDataset);
				};
			};
			resolve(datasetsList);
		});
	}
}
