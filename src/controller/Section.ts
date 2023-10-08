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
	 * a section is valid if includes the same EBNF fields and values in SectionObject
	 * Otherwise return false
	 *
	 * @param section The text content of a section within a course file
	 */
	public validSection(section: any): boolean {
		if (section) {
			for(const property in Section.SectionObject) {
				const propertyName = property as keyof typeof Section.SectionObject;
				if (!(property in section) &&
					typeof section[propertyName] !== Section.SectionObject[propertyName].name.toLowerCase()) {
					return false;
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
	 * Return null if ??
	 *
	 * @param section The text content of a section within a course file, required to be a validSection
	 */
	public parse(section: any): InsightResult {
		const stringID = String(section.id);
		const numberYear = section.Section === "overall" ? 1900 : Number(section.Year);
		const sectionResult: InsightResult = {
			uuid: stringID,
			id: section.Course,
			title: section.Title,
			instructor: section.Professor,
			dept: section.Subject,
			year: numberYear,
			avg: section.Avg,
			pass: section.Pass,
			fail: section.Fail,
			audit: section.Audit
		};
		return sectionResult;
	}
}
