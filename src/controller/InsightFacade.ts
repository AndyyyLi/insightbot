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

const PROJECT_ROOT = path.join(__dirname, "../..");
const DATA_FOLDER_PATH = path.join(PROJECT_ROOT, "data");

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

	private queryEngine: QueryEngine;
	private datasetSectionHelper: DatasetSectionKind;
	private currentDatasets: string[];
	private datasetsMap: Map<string, InsightResult[]>;

	constructor() {
		this.queryEngine = new QueryEngine();
		this.datasetSectionHelper = new DatasetSectionKind();
		this.currentDatasets = [];
		this.datasetsMap = new Map<string, InsightResult[]>();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			if (!id || !content || !kind) {
				reject(new InsightError("Trying to add a dataset with invalid parameters"));
			}

			let InsightResultArray: InsightResult[] = [];
			this.loadDatasetsFromDisk()
				.then(() => {
					if (id === "" || id.includes("_") || this.currentDatasets.includes(id)) {
						reject(new InsightError("Trying to add dataset with an invalid ID, or one with a duplicate " +
							"ID"));
					}

					if (kind === InsightDatasetKind.Rooms) {
						reject(new InsightError("Invalid room kind"));
					} else if (kind === InsightDatasetKind.Sections) {
						return this.datasetSectionHelper.handleDatasetSection(content);
					}
				})
				.then((result) => {
					InsightResultArray = result as InsightResult[];
					return this.saveToDisk(id, InsightResultArray, reject);
				})
				.then(() => {
					this.currentDatasets.push(id);
					this.datasetsMap.set(id, InsightResultArray);
					resolve(this.currentDatasets);
				})
				.catch((error) => {
					reject(error);
				});
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

	public removeDataset(id: string): Promise<string> {
		return this.loadDatasetsFromDisk()
			.then(() => {
				if (id === "" || id.includes("_")) {
					throw new InsightError("Trying to remove dataset with an invalid ID");
				}

				if (!this.currentDatasets.includes(id)) {
					throw new NotFoundError("Trying to remove dataset that has not been added");
				}

				const filePath = path.join(DATA_FOLDER_PATH, id + ".json");
				return fs.remove(filePath);
			})
			.then(() => {
				this.currentDatasets = this.currentDatasets.filter((datasetID) => datasetID !== id);
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
