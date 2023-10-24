import {
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import QueryNode from "./QueryNode";
export default class QueryEngine {
	private currDataset: string;
	private queryParsed: QueryNode[];
	private nextEmptyIdx: number;
	private parsedRawQuery: any;
	private queryCols: string[];
	private order: string;
	constructor() {
		this.currDataset = "";
		this.queryParsed = [];
		this.nextEmptyIdx = 1;
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
		this.queryParsed = [];
		this.nextEmptyIdx = 1;
		this.queryCols = [];
		this.order = "";
	}

	// helpers to determine if a field is S or M type
	private isMfield(field: string): boolean {
		return field === "avg" || field === "pass" || field === "fail" || field === "audit" || field === "year";
	}
	private isSfield(field: string): boolean {
		return field === "dept" || field === "id" || field === "instructor" || field === "title" || field === "uuid";
	}

	// helper function for navigating between different filters
	public handleFilters(objectQueue: any[]) {
		while (objectQueue.length > 0) {
			let curr = objectQueue.shift(), keys = Object.keys(curr);
			if (keys.length !== 1) {
				throw new InsightError("Invalid filter");
			}
			if (keys[0] === "AND" || keys[0] === "OR") {
				let logic = keys[0];
				if (curr[logic].length === 0) {
					throw new InsightError("LOGIC array empty");
				}
				let node = new QueryNode(keys[0], 0, []);
				this.queryParsed.push(node);
				curr[logic].forEach((filterObj: object) => {
					node.pushIntoBody(this.nextEmptyIdx++);
					let key = Object.keys(filterObj);
					if (key.length === 0) {
						throw new InsightError("LOGIC body empty");
					}
					objectQueue.push(filterObj);
				});
			} else if (keys[0] === "GT" || keys[0] === "LT" || keys[0] === "EQ" || keys[0] === "IS") {
				let comp = keys[0], compObj = curr[comp], compKeys = Object.keys(compObj);
				let filter = "", field = this.verifyCompKeyReturnField(compKeys);
				if (!(this.isSfield(field) || this.isMfield(field))) {
					throw new InsightError("Invalid key field!");
				}
				filter += comp + "_" + field;
				if ((comp !== "IS" && (typeof compObj[compKeys[0]] !== "number" || this.isSfield(field))) ||
					(comp === "IS" && (typeof compObj[compKeys[0]] !== "string" || this.isMfield(field)))) {
					throw new InsightError("Invalid key/field type");
				}
				this.queryParsed.push(new QueryNode(filter, comp === "IS" ? 2 : 1, compObj[compKeys[0]]));
			} else if (keys[0] === "NOT") {
				let NOTobj = curr[keys[0]];
				let key = Object.keys(NOTobj);
				if (key.length !== 1) {
					throw new InsightError("Negation body length not 1");
				}
				this.queryParsed.push(new QueryNode(keys[0], 0, [this.nextEmptyIdx++]));
				objectQueue.push(NOTobj);
			} else {
				throw new InsightError("Invalid query filter");
			}
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
		let queue: object[] = [];
		queue.push(where);
		this.handleFilters(queue);
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
		sections.forEach((section: InsightResult) => {
			if (this.queryParsed.length === 0 || this.meetsFilterReqs(section, this.queryParsed[0])) {
				result.push(this.makeInsightResult(section));
			}
		});
		if (result.length > 5000) {
			throw new ResultTooLargeError();
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
	public meetsFilterReqs(section: any, query: QueryNode): boolean {
		let filterType = query.getFilterType(), filter = query.getFilter();
		if (filterType === 0) { // non comp
			let children = query.getBody() as number[];
			if (filter === "AND" || filter === "OR") {
				let success = false;
				for (let child of children) {
					success = this.meetsFilterReqs(section, this.queryParsed[child]);
					if (filter === "AND" ? !success : success) {
						break;
					}
				}
				return success;
			} else { // NOT
				return !this.meetsFilterReqs(section, this.queryParsed[children[0]]);
			}
		} else {
			let components = query.getFilter().split("_");
			let comp = components[0], field = components[1], data = section[field];
			if (filterType === 1) { // mcomp
				let value = query.getBody() as number;
				if (comp === "GT") {
					return data > value;
				} else if (comp === "LT") {
					return data < value;
				} else {
					return data === value;
				}
			} else { // comp
				let name = query.getBody() as string;
				if (!name.includes("*")) {
					return name === data;
				} else {
					if (name === "*" || name === "**") { // full wildcard, anything works
						return true;
					} else if (name.substring(1, (name.length - 1)).includes("*")) {
						throw new InsightError(name + " contains invalid asterisk");
					} else if (name.at(0) === "*" && name.at(-1) === "*") { // contains name
						return data.includes(name.substring(1, name.length - 1));
					} else if (name.at(0) === "*") { // ends with name
						return data.substring(data.length - name.length + 1) === name.substring(1);
					} else { // starts with name
						return data.substring(0, name.length - 1) === name.substring(0, name.length - 1);
					}
				}
			}
		}
	}
}
