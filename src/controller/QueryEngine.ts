import {
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import QueryNode from "./QueryNode";
import QueryObject from "./QueryObject";
export default class QueryEngine {
	private currDataset: string;
	private query: QueryNode[];
	private queryCols: string[];
	private order: string;
	constructor() {
		this.currDataset = "";
		this.query = [];
		this.queryCols = [];
		this.order = "";
	}

	// creates InsightResult with selected columns to be inserted into query result
	public makeInsightResult(section: InsightResult): InsightResult {
		let result: InsightResult = {};
		this.queryCols.forEach((col: string) => {
			result[this.currDataset + "_" + col] = section[col];
		});
		return result;
	}

	// loads in all required fields from queryValidator
	public importQueryObject(queryObject: QueryObject) {
		this.query = queryObject.getQueryNodes();
		this.currDataset = queryObject.getDatasetID();
		this.queryCols = queryObject.getQueryCols();
		this.order = queryObject.getOrder();
	}

	// performs query with this.query, assume syntax is correct checks each section to see if it meets requirements,
	// if so then reads requested columns' values, sorts while inserting if order is specified
	// throw InsightError if requested dataset doesn't exist, ResultTooLargeError if result size is > 5000
	public executeQuery(datasets: Map<string, InsightResult[]>): InsightResult[] {
		let result: InsightResult[] = [];
		let sections = datasets.get(this.currDataset);
		if (!sections) {
			throw new InsightError("Dataset not found");
		}
		sections.forEach((section: InsightResult) => {
			if (this.query.length === 0 || this.meetsFilterReqs(section, this.query[0])) {
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
					success = this.meetsFilterReqs(section, this.query[child]);
					if (filter === "AND" ? !success : success) {
						break;
					}
				}
				return success;
			} else { // NOT
				return !this.meetsFilterReqs(section, this.query[children[0]]);
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
