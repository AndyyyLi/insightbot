import {
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import QueryNode from "./QueryNode";
import QueryObject from "./QueryObject";
import Decimal from "decimal.js";
export default class QueryEngine {
	private queryObject: QueryObject;
	// group used to store InsightResult entries by its key
	private groupsMap: Map<string, InsightResult[]>;
	constructor(queryObject: QueryObject) {
		this.queryObject = queryObject;
		this.groupsMap = new Map<string, InsightResult[]>();
	}

	// creates InsightResult with selected columns to be inserted into query result
	public makeInsightResult(entry: InsightResult): InsightResult {
		let result: InsightResult = {};
		this.queryObject.getQueryCols().forEach((col: string) => {
			result[this.queryObject.getDatasetID() + "_" + col] = entry[col];
		});
		return result;
	}

	public groupResult(insRes: InsightResult) {
		let groupingName = "";
		for (let key of this.queryObject.getGroup()) {
			groupingName += insRes[key];
		}
		let group = this.groupsMap.get(groupingName);
		if (group) {
			group.push(insRes);
		} else {
			this.groupsMap.set(groupingName, [insRes]);
		}
	}

	// iterate through results, track MAX
	private calcMax(results: InsightResult[], tokenKey: string): number {
		let currMax = 0;
		for (let result of results) {
			currMax = (result[tokenKey] > currMax ? result[tokenKey] : currMax) as number;
		}
		return currMax;
	}

	// iterate through results, track MIN
	private calcMin(results: InsightResult[], tokenKey: string): number {
		let currMin = Number.MAX_SAFE_INTEGER;
		for (let result of results) {
			currMin = (result[tokenKey] < currMin ? result[tokenKey] : currMin) as number;
		}
		return currMin;
	}

	// iterate through results, track SUM
	private calcSum(results: InsightResult[], tokenKey: string): number {
		let currSum = 0;
		for (let result of results) {
			currSum += result[tokenKey] as number;
		}
		return Number(currSum.toFixed(2));
	}

	// iterate through results, track total then calc AVG
	private calcAvg(results: InsightResult[], tokenKey: string): number {
		let total: Decimal = new Decimal(0);
		for (let result of results) {
			let resDecimal = new Decimal(result[tokenKey]);
			total = total.add(resDecimal);
		}
		let numRows = results.length;
		let avg = total.toNumber() / numRows;
		return Number(avg.toFixed(2));
	}

	// iterate through each group and add to set, set size represents count of unique occurrances
	private count(results: InsightResult[], tokenKey: string): number {
		let keySet = new Set<number | string>();
		for (let result of results) {
			keySet.add(result[tokenKey]);
		}
		return keySet.size;
	}

	// make groups and apply rules if any exist, otherwise return result untouched
	// creates InsightResults independent of makeInsightResult if there are apply rules
	public applyRules(results: InsightResult[]): InsightResult[] {
		let groups = this.queryObject.getGroup();
		if (groups.length > 0) {
			this.groupsMap.forEach((groupResults) => {
				// note that results.length is > 0
				let newResult: InsightResult = {};
				for (let group of groups) {
					let entry = groupResults[0]; // take first element since all elements in same group
					newResult[this.queryObject.getDatasetID() + "_" + group] = entry[group];
				}
				for (let rule of this.queryObject.getApply()) {
					// rule format: APPLYKEY__APPLYTOKEN__KEY
					let components = rule.split("__");
					let applyKey = components[0], applyToken = components[1],
						tokenKey = components[2].split("_")[1];
					let value: number;
					switch (applyToken) {
						case "MAX":
							value = this.calcMax(groupResults, tokenKey);
							break;
						case "MIN":
							value = this.calcMin(groupResults, tokenKey);
							break;
						case "AVG":
							value = this.calcAvg(groupResults, tokenKey);
							break;
						case "SUM":
							value = this.calcSum(groupResults, tokenKey);
							break;
						case "COUNT":
							value = this.count(groupResults, tokenKey);
							break;
						default:
							throw new InsightError("Error applying rule: " + applyToken);
					}
					newResult[applyKey] = value;
				}
				results.push(newResult);
			});
		}
		return results;
	}

	private isSfield(field: string): boolean {
		return field === "dept" || field === "id" || field === "instructor" || field === "title" || field === "uuid" ||
			field === "shortname" || field === "fullname" || field === "number" || field === "name" ||
			field === "address" || field === "type" || field === "furniture" || field === "href";
	}

	// sorts result if necessary, can take in multiple sort keys in case of tiebreakers
	public setOrder(result: InsightResult[]): InsightResult[] {
		let order = this.queryObject.getOrder();
		if (order !== "") {
			if (order.includes("UP") || order.includes("DOWN")) {
				let orderPriorityList = order.split("_");
				result.sort((entryA: any, entryB: any): number => {
					for (let currOrder of orderPriorityList) {
						if (currOrder === "UP" || currOrder === "DOWN") {
							continue;
						}
						let attribute = this.queryObject.getDatasetID() + "_" + currOrder;
						let res;
						if (this.isSfield(currOrder)) {
							if (entryA[attribute] < entryB[attribute]) {
								res = -1;
							} else if (entryA[attribute] > entryB[attribute]) {
								res = 1;
							} else {
								res = 0;
							}
						} else {
							res = entryA[attribute] - entryB[attribute];
						}
						if (res !== 0) {
							return (orderPriorityList[0] === "UP") ? res : res * -1;
						}
					}
					return 0; // all keys tied, therefore order doesn't change
				});
			} else {
				result.sort((entryA: any, entryB: any): number => {
					let attribute = this.queryObject.getDatasetID() + "_" + order;
					if (this.isSfield(order)) {
						if (entryA[attribute] < entryB[attribute]) {
							return -1;
						} else if (entryA[attribute] > entryB[attribute]) {
							return 1;
						} else {
							return 0;
						}
					} else {
						return entryA[attribute] - entryB[attribute];
					}
				});
			}
		}
		return result;
	}

	// performs query with this.query, assume syntax is correct checks each section to see if it meets requirements,
	// if so then reads requested columns' values, sorts while inserting if order is specified
	// throw InsightError if requested dataset doesn't exist, ResultTooLargeError if result size is > 5000
	public executeQuery(datasets: Map<string, InsightResult[]>): InsightResult[] {
		let result: InsightResult[] = [];
		let dataset = datasets.get(this.queryObject.getDatasetID());
		if (!dataset) {
			throw new InsightError("Dataset not found");
		}
		dataset.forEach((entry: InsightResult) => {
			if (this.queryObject.getQueryNodes().length === 0 ||
				this.meetsFilterReqs(entry, this.queryObject.getQueryNodes()[0])) {
				if (this.queryObject.getGroup().length > 0) { // GROUPING
					this.groupResult(entry);
				} else {
					let newInsRes = this.makeInsightResult(entry);
					result.push(newInsRes);
				}
			}
		});
		result = this.applyRules(result);
		if (result.length > 5000) {
			throw new ResultTooLargeError();
		}
		return this.setOrder(result);
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
					success = this.meetsFilterReqs(section, this.queryObject.getQueryNodes()[child]);
					if (filter === "AND" ? !success : success) {
						break;
					}
				}
				return success;
			} else { // NOT
				return !this.meetsFilterReqs(section, this.queryObject.getQueryNodes()[children[0]]);
			}
		} else { // comp
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
			} else { // scomp
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
