import JSZip from "jszip";
import fs from "fs-extra";
import path from "path";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
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
				this.loadDatasetsFromDisk().then(() => {
					if (id === "" || id.includes("_") || this.currentDatasets.includes(id)) {
						reject(
							new InsightError("Trying to add dataset with an invalid ID, or one with a duplicate ID"));
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
							this.saveToDisk(id, sectionsArray, reject).then(() => {
								this.currentDatasets.push(id);
								this.datasetsMap.set(id, sectionsArray);
								resolve(this.currentDatasets);
							});
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

	// Takes the files in the /courses directory and parses them into desired InsightResult[]
	private processCourseFiles(jsonCourseFiles: string[], reject: (reason?: any) => void): Promise<InsightResult[]> {
		const sectionsArray: InsightResult[] = [];
		let hasValidSection = false;

		const promises = jsonCourseFiles.map((jsonCourseFile) => {
			return new Promise<void>((resolve) => {
				try {
					const courseFile = JSON.parse(jsonCourseFile);
					if ("result" in courseFile) {
						if (courseFile.result && Array.isArray(courseFile.result)) {
							for (const section of courseFile.result) {
								let sectionParser = new Section();
								if (sectionParser.validSection(section)) {
									const parsedSection = sectionParser.parse(section);
									if (parsedSection) {
										sectionsArray.push(parsedSection);
										hasValidSection = true;
									}
								}
							}
							resolve();
						}
					}
				} catch (e) {
					// courseFile could not be parsed, ignored and proceed to the next file
				}
			});
		});
		return Promise.all(promises)
			.then(() => {
				if (hasValidSection) {
					return sectionsArray;
				} else {
					reject(new InsightError("No valid sections found in course files"));
					return [];
				}
			})
			.catch((error) => {
				reject(error);  // This line ensures that the outer promise is rejected with the error.
				return [];
			});
	}

	// Unzips the content and converts files in /courses directory into parsable text
	private extractCourseFiles(content: string, reject: (reason?: any) => void): Promise<string[]> {
		let zip = new JSZip();
		const courseFiles: Array<Promise<string>> = [];
		return zip.loadAsync(content, {base64: true}).then((contents) => {
			Object.keys(contents.files).forEach((filename) => {
				if (filename.startsWith("courses/") && filename.length > "courses/".length) {
					let courseFile = contents.files[filename];
					courseFiles.push(courseFile.async("text").catch(() => {
						// Ignore a non-JSON file, proceed with the next file
						return "";
					}));
				}
			});
			return Promise.all(courseFiles);
		}).catch(() => {
			reject(new InsightError("Trying to add dataset of section kind with content that cannot be unzipped"));
			return [];
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			this.loadDatasetsFromDisk().then(() => {
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
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			this.loadDatasetsFromDisk().then(() => {
				try {
					this.queryEngine.checkNewQuery(query);
					this.queryEngine.checkWhere();
					this.queryEngine.checkOptions();
					let result = this.queryEngine.executeQuery(this.datasetsMap);
					resolve(result);
				} catch (err) {
					reject(err);
				}
			});
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise<InsightDataset[]>((resolve) => {
			let datasetsList: InsightDataset[] = [];
			this.loadDatasetsFromDisk().then(() => {
				for(const key of this.datasetsMap.keys()) {
					const dataset = this.datasetsMap.get(key);
					if (dataset) {
						const currInsightDataset: InsightDataset = {
							id: key,
							kind: InsightDatasetKind.Sections,
							numRows: dataset.length
						};
						datasetsList.push(currInsightDataset);
					}
				}
				resolve(datasetsList);
			});
		});
	}

	private async loadDatasetsFromDisk(): Promise<void> {
		try {
			const folderExists = await fs.pathExists(DATA_FOLDER_PATH);
			if (!folderExists) {
				return;
			}

			const dataFileNames = await fs.readdir(DATA_FOLDER_PATH);

			const dataFilesReadPromises = dataFileNames.map(async (dataFileName) => {
				try {
					const dataFilePath = path.join(DATA_FOLDER_PATH, dataFileName);
					const dataFileContent = await fs.readFile(dataFilePath, "utf-8");

					try {
						const datasetID = dataFileName.replace(".json", "");
						const datasetSectionsArray = JSON.parse(dataFileContent) as InsightResult[];
						if (!this.currentDatasets.includes(datasetID)) {
							this.currentDatasets.push(datasetID);
							this.datasetsMap.set(datasetID, datasetSectionsArray);
						}
					} catch (e) {
						console.error("Could not parse file content and update variables", dataFileName);
						throw e; // Rethrow the error to propagate it
					}
				} catch (e) {
					console.error("Could not read this file in data folder", dataFileName);
					throw e; // Rethrow the error to propagate it
				}
			});

			await Promise.all(dataFilesReadPromises);
		} catch (error) {
			console.error("Error reading data folder:", error);
			throw error;
		}
	}
}
