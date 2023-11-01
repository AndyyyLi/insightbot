import {InsightError, InsightResult} from "./IInsightFacade";

export class DatasetSectionRoom {
	constructor() {
		//
	}

	/**
	 * Extracts and process the room files of the provided content and turn into an InsightResult array of rooms dataset
	 * Return an array of parsed rooms pertaining to the content
	 * @param content base64 zip file
	 */
	public handleDatasetRoom(content: string): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>((resolve, reject) => {
			reject(new InsightError());
		});
	}

	private processRoomFiles(roomFiles: string[], reject: (reason?: any) => void): Promise<InsightResult[]> {
		return Promise.reject(new InsightError());
	}

	private extractRoomFiles(content: string, reject: (reason?: any) => void): Promise<string[]> {
		return Promise.reject(new InsightError());
	}
}
