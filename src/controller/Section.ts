import {InsightResult} from "./IInsightFacade";

export class Section {

	// Define the type for the provided section object
	private static readonly SectionObject = {
		id: Number,
		Course: String,
		Title: String,
		Professor: String,
		Subject: String,
		Year: String,
		Avg: Number,
		Pass: Number,
		Fail: Number,
		Audit: Number
	};

	constructor() {
		// This is a Section class
	}

	/**
	 * If the provided section is valid return true
	 * a section is valid if includes the same EBNF fields in the SectionObject and values that are or can be parsed
	 * into the values in the SectionObject
	 * Otherwise return false
	 *
	 * @param section The text content of a section within a course file
	 */

	public validSection(section: any): boolean {
		if (section) {
			for (const field in Section.SectionObject) {
				const fieldName = field as keyof typeof Section.SectionObject;
				if (!(field in section)) {
					return false;
				}

				const fieldType = Section.SectionObject[fieldName];
				if (fieldType === Number) {
					if (typeof section[fieldName] !== "number" && isNaN(Number(section[fieldName]))) {
						return false;
					}
				} else if (fieldType === String) {
					if (typeof section[fieldName] !== "string" && typeof section[fieldName] !== "number") {
						return false;
					}
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * Parse through the valid section and return a subset of the section as an InsightResult
	 * the returned InsightResult should include the EBNF fields:
	 * uuid, id, title, instructor, dept, year, avg, pass, fail, audit
	 * The type for the fields' values are respectively:
	 * String, String, String, String, String, Number, Number, Number, Number, Number
	 *
	 * @param section The text content of a section within a course file, required to be a validSection
	 */
	public parse(section: any): InsightResult {
		const numberYear = section.Section === "overall" ? 1900 : Number(section.Year);
		const sectionResult: InsightResult = {
			uuid: String(section.id),
			id: String(section.Course),
			title: String(section.Title),
			instructor: String(section.Professor),
			dept: String(section.Subject),
			year: numberYear,
			avg: Number(section.Avg),
			pass: Number(section.Pass),
			fail: Number(section.Fail),
			audit: Number(section.Audit)
		};
		return sectionResult;
	}
}
