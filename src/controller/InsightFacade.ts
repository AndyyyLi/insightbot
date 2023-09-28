import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";

import QueryEngine from "./QueryEngine";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private queryEngine: QueryEngine;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.queryEngine = new QueryEngine();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// return Promise.reject("Not implemented.");
		return Promise.resolve(["sections"]);
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			try {
				let result = this.queryEngine.checkNewQuery(query);
				resolve(result);
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
		return Promise.reject("Not implemented.");
	}
}
