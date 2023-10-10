// import JSZip from "jszip";
// import {
// 	IInsightFacade,
// 	InsightDataset,
// 	InsightDatasetKind,
// 	InsightError,
// 	InsightResult,
// 	NotFoundError
// } from "./IInsightFacade";
// import {Section} from "./Section";
//
// /**
//  * This is the main programmatic entry point for the project.
//  * Method documentation is in IInsightFacade
//  *
//  */
// export default class InsightFacade implements IInsightFacade {
// 	public currentDatasets: string[];
// 	public datasetsMap: Map<string, InsightResult[]>;
//
// 	constructor() {
// 		this.currentDatasets = [];
// 		this.datasetsMap = new Map<string, []>();
// 	}
//
// 	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
// 		return new Promise<string[]>( (resolve, reject) => {
// 			if (id && content && kind) {
// 				if (id === "" || id.includes("_") || this.currentDatasets.includes(id)) {
// 					reject(new InsightError("Trying to add datatset with an invalid ID, or one with a duplicate ID"));
// 				}
//
// 				if (kind === InsightDatasetKind.Rooms) {
// 					reject(new InsightError("Trying to add dataset with Rooms kind"));
// 				}
//
// 				const courseFiles = this.extractCourseFiles(content, reject);
// 				const sectionsArray = this.processCourseFiles(courseFiles, reject);
// 				if (sectionsArray.length === 0) {
// 					reject(new InsightError("Trying to add dataset with no valid sections in course file"));
// 				}
// 				// save to disk
// 				this.currentDatasets.push(id);
// 				this.datasetsMap.set(id, sectionsArray);
// 				resolve(this.currentDatasets);
// 			} else {
// 				reject(new InsightError("Trying to add a dataset with invalid parameters"));
// 			}
// 		});
// 	}
//
// 	private processCourseFiles(courseFiles: Array<Promise<string>>, reject: (reason?: any) => void) {
// 		const sectionsArray: InsightResult[] = [];
// 		Promise.all(courseFiles).then(function (jsonCourseFiles) {
// 			for (const jsonCourseFile of jsonCourseFiles) {
// 				try {
// 					const courseFile = JSON.parse(jsonCourseFile);
// 					if (courseFile.result && Array.isArray(courseFile.result)) {
// 						for (const section of courseFile.result) {
// 							let sectionParser = new Section();
// 							if (sectionParser.validSection(section)) {
// 								const parsedSection = sectionParser.parse(section);
// 								if (parsedSection) {
// 									sectionsArray.push(parsedSection);
// 								}
// 							}
// 						}
// 					} else {
// 						reject(new InsightError("JSON file does not include a 'result' key"));
// 					}
// 				} catch (e) {
// 					reject(new InsightError("JSON file could not be parsed"));
// 				}
// 			}
// 		});
// 		return sectionsArray;
// 	}
//
// 	// Unzips the content and tries to convert all JSON files in the courses folder into a parsable text
// 	private extractCourseFiles(content: string, reject: (reason?: any) => void) {
// 		let zip = new JSZip();
// 		const courseFiles: Array<Promise<string>> = [];
// 		zip.loadAsync(content, {base64: true}).then(function (contents) {
// 			const coursesFolder = contents?.folder("courses");
// 			if ("courses/" in contents.files && coursesFolder && coursesFolder.files) {
// 				Object.keys(coursesFolder.files).forEach((filename) => {
// 					try {
// 						let courseFile = coursesFolder.files[filename];
// 						courseFiles.push(courseFile.async("text"));
// 					} catch (e) {
// 						reject(new InsightError("Trying to add dataset with non-JSON file"));
// 					}
// 				});
// 			} else {
// 				reject(new InsightError("Trying to add dataset with no courses folder"));
// 			}
// 		}).catch(function (error) {
// 			reject(new InsightError("Trying to add dataset with content that cannot be unzipped"));
// 		});
//
// 		return Promise.all(courseFiles);
// 	}
//
// 	public removeDataset(id: string): Promise<string> {
// 		return Promise.reject("Not implemented.");
// 	}
//
// 	public performQuery(query: unknown): Promise<InsightResult[]> {
// 		return Promise.reject("Not implemented.");
// 		// return Promise.resolve([]);
// 	}
//
// 	public listDatasets(): Promise<InsightDataset[]> {
// 		return Promise.reject("Not implemented.");
// 	}
// }
