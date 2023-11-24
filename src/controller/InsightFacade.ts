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
import QueryEngine from "./QueryEngine";
import {DatasetSectionKind} from "./DatasetSectionKind";
import {DatasetSectionRoom} from "./DatasetSectionRoom";

const PROJECT_ROOT = path.join(__dirname, "../..");
const DATA_FOLDER_PATH = path.join(PROJECT_ROOT, "data");

import QueryValidator from "./QueryValidator";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

	private datasetSectionHelper: DatasetSectionKind;
	private datasetRoomHelper: DatasetSectionRoom;
	private currentDatasets: string[];
	private queryEngine: QueryEngine | undefined;
	private queryValidator: QueryValidator;
	private datasetsMap: Map<string, InsightResult[]>;
	private datasetsType: Map<string, InsightDatasetKind>;

	constructor() {
		this.currentDatasets = [];
		this.queryValidator = new QueryValidator();
		this.datasetSectionHelper = new DatasetSectionKind();
		this.datasetRoomHelper = new DatasetSectionRoom();
		this.currentDatasets = [];
		this.datasetsMap = new Map<string, InsightResult[]>();
		this.datasetsType = new Map<string, InsightDatasetKind>();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			if (!id || !content || !kind) {
				throw new InsightError("Trying to add a dataset with invalid parameters");
			}

			let InsightResultArray: InsightResult[] = [];
			this.loadDatasetsFromDisk()
				.then(() => {
					if (id === "" || id.includes("_") || this.currentDatasets.includes(id) ||
						id.trim().length === 0) {
						throw new InsightError("Trying to add dataset with an invalid ID, or one with a duplicate ID");
					}
					if (kind === InsightDatasetKind.Rooms) {
						return this.datasetRoomHelper.handleDatasetRoom(content);
					} else if (kind === InsightDatasetKind.Sections) {
						return this.datasetSectionHelper.handleDatasetSection(content);
					}
				})
				.then((result) => {
					InsightResultArray = result as InsightResult[];
					if (InsightResultArray.length < 1) {
						reject(new InsightError("No valid section or rooms in dataset"));
					}
					return this.saveToDisk(id, InsightResultArray, kind, reject);
				})
				.then(() => {
					this.currentDatasets.push(id);
					this.datasetsType.set(id, kind);
					this.datasetsMap.set(id, InsightResultArray);
					resolve(this.currentDatasets);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	// Saves the desired InsightResult[] to disk
	private async saveToDisk(id: string, sections: InsightResult[], kind: InsightDatasetKind, reject: (reason?: any) =>
		void) {
		try {
			await fs.mkdir(DATA_FOLDER_PATH, {recursive: true});

			let filePath = "";
			if (kind === InsightDatasetKind.Sections) {
				filePath = path.join(DATA_FOLDER_PATH, id + "-Sections.json");
			} else {
				filePath = path.join(DATA_FOLDER_PATH, id + "-Rooms.json");
			}
			await fs.writeFile(filePath, JSON.stringify(sections, null, 2));
		} catch (error: any) {
			reject(new InsightError("Failed to save dataset to disk: " + error.message));
		}
	}

	public removeDataset(id: string): Promise<string> {
		return this.loadDatasetsFromDisk()
			.then(() => {
				if (id === "" || id.includes("_") || id.trim().length === 0) {
					throw new InsightError("Trying to remove dataset with an invalid ID");
				}

				if (!this.currentDatasets.includes(id)) {
					throw new NotFoundError("Trying to remove dataset that has not been added");
				}

				let filePath = "";
				if (this.datasetsType.get(id) === InsightDatasetKind.Sections) {
					filePath = path.join(DATA_FOLDER_PATH, id + "-Sections.json");
				} else {
					filePath = path.join(DATA_FOLDER_PATH, id + "-Rooms.json");
				}
				return fs.remove(filePath);
			})
			.then(() => {
				this.currentDatasets = this.currentDatasets.filter((datasetID) => datasetID !== id);
				this.datasetsType.delete(id);
				this.datasetsMap.delete(id);
				return id;
			})
			.catch((error) => {
				if (error instanceof InsightError || error instanceof NotFoundError) {
					throw error;
				} else {
					throw new NotFoundError("Trying to remove dataset with unknown file path");
				}
			});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			this.loadDatasetsFromDisk().then(() => {
				try {
					this.queryValidator.checkNewQuery(query, this.datasetsType);
					this.queryValidator.checkWhere();
					this.queryValidator.checkOptions();
					this.queryValidator.checkTransformations();
					this.queryEngine = new QueryEngine(this.queryValidator.makeQueryObj());
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
					const datasetType = this.datasetsType.get(key);
					if (dataset && datasetType) {
						const currInsightDataset: InsightDataset = {
							id: key,
							kind: datasetType,
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
						const datasetID = dataFileName.split("-")[0];
						const datasetKind = dataFileName.split("-")[1].replace(".json", "");
						const datasetSectionsArray = JSON.parse(dataFileContent) as InsightResult[];
						if (!this.currentDatasets.includes(datasetID)) {
							this.currentDatasets.push(datasetID);
							this.datasetsType.set(datasetID, datasetKind === "Sections" ?
								InsightDatasetKind.Sections : InsightDatasetKind.Rooms);
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
