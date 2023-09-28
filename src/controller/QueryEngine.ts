import {
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";

export default class QueryEngine {
	private currDataset: string | undefined;
	private queryParsed: InsightResult | undefined;
	private queryCols: string[] | undefined;
	private order: string | undefined;

	constructor() {
		console.log("QueryEngine created");
	}

	// checks top level syntax and that WHERE and OPTIONS exist
	// calls checkWhere and checkOptions, and executeQuery if query is valid
	// can throw InsightError and ResultTooLargeError
	public checkNewQuery(query: unknown): InsightResult[] {
		// check topmost level syntax
		if (query == null || typeof query !== "object") {
			throw InsightError;
		}

		let stringified = JSON.stringify(query);
		let parsedRawQuery = JSON.parse(stringified);

		let keys = Object.keys(parsedRawQuery);
		if (keys.length !== 2 || keys[0] !== "WHERE" || keys[1] !== "OPTIONS") {
			throw InsightError;
		}

		// reset values
		this.queryParsed = {};
		this.currDataset = "";
		this.queryCols = [];
		this.order = undefined;

		// call each of the two "subtrees"
		this.checkWhere(parsedRawQuery.WHERE);
		this.checkOptions(parsedRawQuery.OPTIONS);

		console.log(this.queryParsed);
		console.log(this.queryCols);
		console.log(this.order);
		// return this.executeQuery();
		return [];
	}

	// helper function for navigating between different filters
	private switchFilter(curr: any, filter: string, prefix: string) {
		if (prefix !== "") {
			prefix += "_";
		}

		switch (filter) {
			case "AND":
				this.checkLogic(curr.AND, false, prefix);
				break;
			case "OR":
				this.checkLogic(curr.OR, true, prefix);
				break;
			case "GT":
				this.checkMComparison(curr.GT, "GT", prefix);
				break;
			case "LT":
				this.checkMComparison(curr.LT, "LT", prefix);
				break;
			case "EQ":
				this.checkMComparison(curr.EQ, "EQ", prefix);
				break;
			case "IS":
				this.checkSComparison(curr.IS, prefix);
				break;
			case "NOT":
				this.checkNegation(curr.NOT, prefix);
				break;
			default:
				throw InsightError;
		}
	}

	// checks filter validity if present, calls appropriate filter method
	// calls checkLogic, checkMComparison, checkSComparison, or checkNegation
	// can throw InsightError
	private checkWhere(where: any) {
		let key = Object.keys(where);
		if (key.length === 0) {
			return;
		}
		if (key.length > 1) {
			throw InsightError;
		}

		this.switchFilter(where, key[0], "");
	}

	// checks syntax, can call itself or any other filter method
	// isOR is true if logic is 'OR', else is false (logic is 'AND')
	// if OR: marks all components such that if at least one is true, the entire logic is true
	// if AND: marks all components such that if at least one is false, the entire logic is false
	// can throw InsightError
	private checkLogic(logic: object[], isOR: boolean, prefix: string) {
		if (logic.length === 0) {
			throw InsightError;
		}

		if (isOR) {
			prefix += "OR";
		} else {
			prefix += "AND";
		}

		logic.forEach((filterObj: object) => {
			let key = Object.keys(filterObj);
			if (key.length === 0) {
				throw InsightError;
			}

			this.switchFilter(filterObj, key[0], prefix);
		});
	}

	// helper for verifying comparison key is valid and splits into array
	// checks referenced dataset, returns respect mfield or sfield
	private verifyCompKeyReturnField(key: string[]): string {
		if (key.length !== 1) {
			throw InsightError;
		}

		let components = key[0].split("_");

		if (components.length !== 2) {
			throw InsightError;
		}

		if (this.currDataset === "") {
			// store querying dataset
			this.currDataset = components[0];
		} else if (this.currDataset !== components[0]) {
			// referencing two datasets
			throw InsightError;
		}

		return components[1];
	}

	// checks syntax, if valid return filter
	// can throw InsightError
	private checkMComparison(mcomp: any, math: string, prefix: string) {
		let key = Object.keys(mcomp);

		let mfield = this.verifyCompKeyReturnField(key);

		if (math === "LT") {
			prefix += "LT_";
		} else if (math === "GT") {
			prefix += "GT_";
		} else {
			prefix += "EQ_";
		}
		prefix += mfield;

		if (this.queryParsed) {
			this.queryParsed[prefix] = mcomp[key[0]];
		} else {
			throw InsightError;
		}
	}

	// checks syntax, if valid return filter
	// can throw InsightError
	private checkSComparison(is: any, prefix: string) {
		let key = Object.keys(is);

		let sfield = this.verifyCompKeyReturnField(key);

		prefix += sfield;

		if (this.queryParsed) {
			this.queryParsed[prefix] = is[key[0]];
		} else {
			throw InsightError;
		}
	}

	// checks syntax, marks all components such that the return logic is negated
	// can call itself or any other filter
	// can throw InsightError
	private checkNegation(not: any, prefix: string) {
		let key = Object.keys(not);

		if (key.length !== 1) {
			throw InsightError;
		}

		prefix += "NOT";

		this.switchFilter(not, key[0], prefix);
	}

	// checks syntax, calls checkColumns, and checkOrder if it exists
	// can throw InsightError
	private checkOptions(options: any) {
		let keys = Object.keys(options);

		if (keys.length === 0 || keys.length > 2) {
			throw InsightError;
		}

		if (keys[0] === "COLUMNS") {
			this.checkColumns(options.COLUMNS);
		} else {
			throw InsightError;
		}

		if (keys.length === 2) {
			if (keys[1] === "ORDER") {
				this.checkOrder(options.ORDER);
			} else {
				throw InsightError;
			}
		}
	}

	// checks syntax, adds filtered columns to queryCols
	// can throw InsightError
	private checkColumns(columns: string[]) {
		columns.forEach((col: string) => {
			let components = col.split("_");

			if (components.length !== 2 || components[0] !== this.currDataset) {
				throw InsightError;
			}

			if (this.queryCols && !this.queryCols.includes(components[1])) {
				this.queryCols.push(components[1]);
			} else {
				throw InsightError;
			}
		});
	}

	// checks syntax, sets order
	// can throw InsightError
	private checkOrder(order: string) {
		let components = order.split("_");

		if (components.length !== 2 || components[0] !== this.currDataset) {
			throw InsightError;
		}

		if (this.queryCols && !this.queryCols.includes(components[1])) {
			throw InsightError;
		}

		this.order = components[1];
	}

	// performs query with queryParsed, assume syntax is correct
	// iterates through sections, checks each section to see if it meets requirements, if so then reads requested
	// columns' values, sorts while inserting if order is specified
	// can throw ResultTooLargeError if result size is > 5000
	private executeQuery(): InsightResult[] {
		let result: InsightResult[] = [];
		// let sections = <GET SECTIONS DATA STRUCTURE>;
		// let id = <GET DATASET ID>;
		// let filters = Object.keys(this.queryParsed);
		//
		// sections.forEach((section: any) => {
		// 		filters.forEach((filter: string) => {
		//			let checks = Object.keys(filter);
		//			if (checkFilter(section, filter)) {
		//				let insightResult = this.makeInsightResult(section);
		//				this.insertSection(insightResult);
		//			}
		// 		}
		// });

		return result;
	}

	// checks filter in reverse order to see if section meets requirements
	// returns true if filter meets requirement, else return false
	private checkFilter(section: any, filter: string): boolean {
		return true;
	}

	// only called if order exists; places section in appropriate location in result
	// if order is numerical, sort by ascending
	// if order is alphabetical, sort by alphabetical according to ASCII order
	private insertSection(section: InsightResult) {
		return;
	}
}
