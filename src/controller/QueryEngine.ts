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
			throw new InsightError("Query is null or not an object");
		}
		this.parsedRawQuery = JSON.parse(JSON.stringify(query));
		let keys = Object.keys(this.parsedRawQuery);
		if (keys.length !== 2 || keys[0] !== "WHERE" || keys[1] !== "OPTIONS") {
			throw new InsightError("Query keys invalid");
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
				throw new InsightError("Invalid query filter");
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
			throw new InsightError("WHERE key > 1");
		}
		this.switchFilter(where, key[0], "");
	}

	// checks syntax, can call itself or any other filter method
	// isOR is true if logic is 'OR', else is false (logic is 'AND')
	// can throw InsightError
	public checkLogic(logic: object[], logicStr: string, prefix: string) {
		if (logic.length === 0) {
			throw new InsightError("LOGIC array empty");
		}
		prefix += logicStr;
		logic.forEach((filterObj: object) => {
			let key = Object.keys(filterObj);
			if (key.length === 0) {
				throw new InsightError("LOGIC body empty");
			}
			this.switchFilter(filterObj, key[0], prefix);
		});
	}

	// helper for verifying comparison key is valid and splits into array
	// checks referenced dataset, returns respective mfield or sfield key
	public verifyCompKeyReturnField(key: string[]): string {
		if (key.length !== 1) {
			throw new InsightError("COMP key not length 1");
		}
		let components = key[0].split("_");
		if (components.length !== 2) {
			throw new InsightError("invalid COMP components");
		}
		if (this.currDataset === "") {
			this.currDataset = components[0];
		} else if (this.currDataset !== components[0]) {
			throw new InsightError("Referencing two datasets");
		}
		return components[1];
	}

	// checks syntax, if valid add filter to query, math argument must accompany LT/GT/EQ prefix
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
			throw new InsightError("Incorrect field type");
		}
		this.queryParsed[prefix] = comp[key[0]];
	}

	// checks syntax, marks all components such that the return logic is negated
	// can call itself or any other filter
	// can throw InsightError
	public checkNegation(not: any, prefix: string) {
		let key = Object.keys(not);
		if (key.length !== 1) {
			throw new InsightError("Negation body length not 1");
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
			throw new InsightError("Invalid OPTIONS key");
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
			throw new InsightError("Invalid COLUMNS format");
		}
		columns.forEach((col: string) => {
			let components = col.split("_");
			if (components.length !== 2 || this.queryCols.includes(components[1])) {
				throw new InsightError("Invalid COLUMNS filter");
			}
			if (this.currDataset === "") {
				this.currDataset = components[0];
			} else if (components[0] !== this.currDataset) {
				throw new InsightError("Incorrect dataset ID in COLUMNS");
			}
			this.queryCols.push(components[1]);
		});
	}

	// checks syntax, sets order, order must be type string
	// can throw InsightError
	public checkOrder(order: any) {
		if (typeof order !== "string") {
			throw new InsightError("ORDER not string");
		}
		let components = order.split("_");
		if (components.length !== 2 || components[0] !== this.currDataset || !this.queryCols.includes(components[1])) {
			throw new InsightError("Invalid ORDER format");
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
			throw new InsightError("Dataset not found");
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
		let success: boolean, reqs = filter.split("_");
		let idx = reqs.length - 1, curr = reqs[idx], data = section[curr];
		let queryVal = this.queryParsed[filter];
		curr = reqs[--idx];
		if (curr === "GT" || curr === "LT") {
			success = curr === "GT" ? data > queryVal : data < queryVal;
			idx--;
		} else if (curr === "NOT") {
			success = data !== queryVal;
			idx--;
		} else { // EQ or IS (implicit)
			if (curr === "EQ" || !(queryVal as string).includes("*")) {
				idx -= curr === "EQ" ? 1 : 0;
				success = data === queryVal;
			} else {
				queryVal = queryVal as string;
				if (queryVal.substring(1, (queryVal.length - 1)).includes("*")) {
					throw new InsightError("QueryVal: " + queryVal + " contains invalid asterisk");
				} else if (queryVal.at(0) === "*" && queryVal.at(-1) === "*") { // contains queryVal
					success = data.includes(queryVal.substring(1, queryVal.length - 1));
				} else if (queryVal.at(0) === "*") { // ends with queryVal
					success = data.substring(data.length - queryVal.length + 1) === queryVal.substring(1);
				} else { // starts with queryVal
					success = data.substring(0, queryVal.length - 1) === queryVal.substring(0, queryVal.length - 1);
				}
			}
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
