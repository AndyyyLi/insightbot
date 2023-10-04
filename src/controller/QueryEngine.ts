import {
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
export default class QueryEngine {
	private currDataset: string;
	private queryParsed: InsightResult;
	private parsedRawQuery: any;
	private queryCols: string[];
	private order: string;
	constructor() {
		this.currDataset = "";
		this.queryParsed = {};
		this.parsedRawQuery = {};
		this.queryCols = [];
		this.order = "";
	}
	// checks top level syntax and that WHERE and OPTIONS exist
	// calls checkWhere and checkOptions, and executeQuery if query is valid
	// can throw InsightError
	public checkNewQuery(query: unknown): void {
		if (query == null || typeof query !== "object") {
			throw InsightError;
		}
		this.parsedRawQuery = JSON.parse(JSON.stringify(query));
		let keys = Object.keys(this.parsedRawQuery);
		if (keys.length !== 2 || keys[0] !== "WHERE" || keys[1] !== "OPTIONS") {
			throw InsightError;
		}
		// reset values
		this.currDataset = "";
		this.queryParsed = {};
		this.queryCols = [];
		this.order = "";
	}

	// helper function for navigating between different filters
	public switchFilter(curr: any, filter: string, prefix: string) {
		if (prefix !== "") {
			prefix += "_";
		}
		switch (filter) {
			case "AND":
				this.checkLogic(curr.AND, "AND", prefix);
				break;
			case "OR":
				this.checkLogic(curr.OR, "OR", prefix);
				break;
			case "GT":
				this.checkComparison(curr.GT, prefix, "GT");
				break;
			case "LT":
				this.checkComparison(curr.LT, prefix, "LT");
				break;
			case "EQ":
				this.checkComparison(curr.EQ, prefix, "EQ");
				break;
			case "IS":
				this.checkComparison(curr.IS, prefix);
				break;
			case "NOT":
				this.checkNegation(curr.NOT, prefix);
				break;
			default:
				throw InsightError;
		}
	}

	// checks filter validity if present, calls appropriate filter method
	// calls checkLogic, checkComparison, checkSComparison, or checkNegation
	// can throw InsightError
	public checkWhere() {
		let where = this.parsedRawQuery.WHERE;
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
	// can throw InsightError
	public checkLogic(logic: object[], logicStr: string, prefix: string) {
		if (logic.length === 0) {
			throw InsightError;
		}
		prefix += logicStr;
		logic.forEach((filterObj: object) => {
			let key = Object.keys(filterObj);
			if (key.length === 0) {
				throw InsightError;
			}
			this.switchFilter(filterObj, key[0], prefix);
		});
	}

	// helper for verifying comparison key is valid and splits into array
	// checks referenced dataset, returns respective mfield or sfield key
	public verifyCompKeyReturnField(key: string[]): string {
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

	// checks syntax, if valid return filter, math argument must accompany LT/GT/EQ prefix
	// can throw InsightError
	public checkComparison(comp: any, prefix: string, math?: string) {
		let key = Object.keys(comp);
		let field = this.verifyCompKeyReturnField(key);
		if (math === "LT") {
			prefix += "LT_";
		} else if (math === "GT") {
			prefix += "GT_";
		} else if (math === "EQ") {
			prefix += "EQ_";
		}
		prefix += field;
		if ((math && typeof comp[key[0]] !== "number") || (!math && typeof comp[key[0]] !== "string")) {
			throw InsightError;
		}
		this.queryParsed[prefix] = comp[key[0]];
	}

	// checks syntax, marks all components such that the return logic is negated
	// can call itself or any other filter
	// can throw InsightError
	public checkNegation(not: any, prefix: string) {
		let key = Object.keys(not);
		if (key.length !== 1) {
			throw InsightError;
		}
		prefix += "NOT";
		this.switchFilter(not, key[0], prefix);
	}

	// checks syntax, calls checkColumns, and checkOrder if it exists
	// can throw InsightError
	public checkOptions() {
		let options = this.parsedRawQuery.OPTIONS;
		let keys = Object.keys(options);
		if (keys.length === 0 || keys.length > 2 || keys[0] !== "COLUMNS" ||
			(keys.length === 2 && keys[1] !== "ORDER")) {
			throw InsightError;
		}
		this.checkColumns(options.COLUMNS);
		if (keys.length === 2) {
			this.checkOrder(options.ORDER);
		}
	}

	// checks syntax, adds filtered columns to queryCols
	// can throw InsightError
	public checkColumns(columns: any) {
		if (!Array.isArray(columns) || columns.length === 0 || typeof columns[0] !== "string") {
			throw InsightError;
		}
		columns.forEach((col: string) => {
			let components = col.split("_");
			if (components.length !== 2 || this.queryCols.includes(components[1])) {
				throw InsightError;
			}
			if (this.currDataset === "") {
				this.currDataset = components[0];
			} else if (components[0] !== this.currDataset) {
				throw InsightError;
			}
			this.queryCols.push(components[1]);
		});
	}

	// checks syntax, sets order, order must be type string
	// can throw InsightError
	public checkOrder(order: any) {
		if (typeof order !== "string") {
			throw InsightError;
		}
		let components = order.split("_");
		if (components.length !== 2 || components[0] !== this.currDataset || !this.queryCols.includes(components[1])) {
			throw InsightError;
		}
		this.order = components[1];
	}

	// creates InsightResult with selected columns to be inserted into query result
	public makeInsightResult(section: InsightResult): InsightResult {
		let result: InsightResult = {};
		this.queryCols.forEach((col: string) => {
			result[this.currDataset + "_" + col] = section[col];
		});
		return result;
	}

	// performs query with queryParsed, assume syntax is correct checks each section to see if it meets requirements,
	// if so then reads requested columns' values, sorts while inserting if order is specified
	// throw InsightError if requested dataset doesn't exist, ResultTooLargeError if result size is > 5000
	public executeQuery(datasets: Map<string, InsightResult[]>): InsightResult[] {
		let result: InsightResult[] = [];
		let sections = datasets.get(this.currDataset);
		if (!sections) {
			throw InsightError;
		}
		let filters = Object.keys(this.queryParsed);
		console.log(this.queryParsed);
		console.log(this.queryCols);
		console.log(this.order);
		sections.forEach((section: InsightResult) => {
			if (filters.length > 0) {
				filters.forEach((filter: string) => {
					if (this.meetsFilterReqs(section, filter)) {
						result.push(this.makeInsightResult(section));
					}
				});
			} else {
				result.push(this.makeInsightResult(section));
			}
		});
		if (result.length > 5000) {
			throw ResultTooLargeError;
		}
		if (this.order !== "") {
			result.sort((sectionA: any, sectionB: any): number => {
				let attribute = this.currDataset + "_" + this.order;
				if (this.order === "dept" || this.order === "id" || this.order === "instructor" ||
					this.order === "title" || this.order === "uuid") {
					return sectionA[attribute].localeCompare(sectionB[attribute], undefined, {numeric: true});
				} else {
					return sectionA[attribute] - sectionB[attribute];
				}
			});
		}
		return result;
	}

	// checks filter in reverse order to see if section meets requirements
	// returns true if filter meets all requirements, else return false
	// if OR: marks all components such that if at least one is true, the entire logic is true
	// if AND: marks all components such that if at least one is false, the entire logic is false
	public meetsFilterReqs(section: any, filter: string): boolean {
		let success: boolean;
		let reqs = filter.split("_");
		let idx = reqs.length - 1;
		let curr = reqs[idx];
		let data = section[curr];
		curr = reqs[--idx];
		if (curr === "GT") {
			success = data > this.queryParsed[filter];
			idx--;
		} else if (curr === "LT") {
			success = data < this.queryParsed[filter];
			idx--;
		} else if (curr === "NOT") {
			success = data !== this.queryParsed[filter];
			idx--;
		} else {
			// EQ or IS (implicit)
			if (curr === "EQ") {
				idx--;
			}
			success = data === this.queryParsed[filter];
		}
		for (idx; idx >= 0; idx--) {
			curr = reqs[idx];
			if (curr === "AND" && !success) {
				return false;
			} else if (curr === "OR" && success) {
				return true;
			} else if (curr === "NOT") {
				success = !success;
			}
		}
		return success;
	}
}
