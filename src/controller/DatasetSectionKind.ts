import {InsightError, InsightResult} from "./IInsightFacade";
import {Section} from "./Section";
import JSZip from "jszip";

export class DatasetSectionKind {

	constructor() {
		//
	}

	/**
	 * Extracts and process the course files of the provided content
	 * Returns an array of parsed sections pertaining to the content
	 * @param content base64 zip file
	 */
	public handleDatasetSection(content: string): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>((resolve, reject) => {
			this.extractCourseFiles(content, reject)
				.then((courseFiles) => {
					// Check if there was an error during extraction
					if (courseFiles.length === 0) {
						reject(new InsightError("No valid course files found"));
					}
					return this.processCourseFiles(courseFiles, reject);
				})
				.then((InsightResultArray) => {
					// Check if there was an error during processing
					if (InsightResultArray.length === 0) {
						reject(new InsightError("Trying to add dataset with no valid sections in course file"));
					} else {
						resolve(InsightResultArray);
					}
				})
				.catch(() => reject(new InsightError("Error adding section kind dataset")));
		});
	}


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
					resolve();
				}
			});
		});
		return Promise.all(promises).then(() => sectionsArray).catch((error) => {
			reject(error);
			return [];
		});
	}

	// Unzips the content and converts files in /courses directory into parsable text
	private extractCourseFiles(content: string, reject: (reason?: any) => void): Promise<string[]> {
		let zip = new JSZip();

		return zip.loadAsync(content, {base64: true})
			.then((contents) => {
				const courseFilesPromise = Object.keys(contents.files).map(async (filename) => {
					if (filename.startsWith("courses/") && filename.length > "courses/".length) {
						let courseFile = contents.files[filename];
						try {
							const text = await courseFile.async("text");
							return text;
						} catch (error) {
							return "";
						}
					}
					return "";
				});

				return Promise.all(courseFilesPromise);
			})
			.then((courseFiles) => {
				const validResults = courseFiles.filter((file) => file !== "");
				return validResults;
			})
			.catch((error) => {
				reject(error);
				return [];
			});
	}
}


