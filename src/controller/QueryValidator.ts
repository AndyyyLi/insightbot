import {InsightDatasetKind, InsightError,} from "./IInsightFacade";
import QueryNode from "./QueryNode";
import QueryObject from "./QueryObject";

export default class QueryValidator {
	private currDataset: string;
	private queryParsed: QueryNode[];
	private nextEmptyIdx: number;
	private parsedRawQuery: any;
	private queryCols: string[];
	private order: string;
	private sectionsDataset: boolean;
	private datasetTypes: Map<string, InsightDatasetKind>;
	private transformations: string[][]; // [0] contains GROUP array, [1] contains APPLY array
	constructor() {
		this.currDataset = "";
		this.queryParsed = [];
		this.nextEmptyIdx = 1;
		this.parsedRawQuery = {};
		this.queryCols = [];
		this.order = "";
		this.sectionsDataset = true;
		this.datasetTypes = new Map<string, InsightDatasetKind>();
		this.transformations = [];
	}

	// returns query object for QueryEngine, should be called after validating a raw query
	public makeQueryObj(): QueryObject {
		return new QueryObject(this.currDataset, this.queryParsed, this.queryCols, this.order, this.transformations);
	}

	// checks top level syntax and that WHERE and OPTIONS exist
	// calls checkWhere and checkOptions, and executeQuery if query is valid
	public checkNewQuery(query: unknown, datasetTypes: Map<string, InsightDatasetKind>): void {
		if (query == null || typeof query !== "object") {
			throw new InsightError("Query is null or not an object");
		}
		this.parsedRawQuery = JSON.parse(JSON.stringify(query));
		let keys = Object.keys(this.parsedRawQuery);
		if (keys.length < 2 || keys[0] !== "WHERE" || keys[1] !== "OPTIONS" ||
			(keys.length === 3 && keys[2] !== "TRANSFORMATIONS")) {
			throw new InsightError("Query keys invalid");
		}
		// reset values
		this.currDataset = "";
		this.queryParsed = [];
		this.nextEmptyIdx = 1;
		this.queryCols = [];
		this.order = "";
		this.transformations = [];
		this.datasetTypes = datasetTypes;
	}

	private isMfield(field: string): boolean {
		if (this.sectionsDataset) {
			return field === "avg" || field === "pass" || field === "fail" || field === "audit" || field === "year";
		} else {
			return field === "lat" || field === "lon" || field === "seats";
		}
	}

	private isSfield(field: string): boolean {
		if (this.sectionsDataset) {
			return field === "dept" || field === "id" || field === "instructor" || field === "title" ||
				field === "uuid";
		} else {
			return field === "fullname" || field === "shortname" || field === "number" || field === "name" ||
				field === "address" || field === "type" || field === "furniture" || field === "href";
		}
	}

	// checks and creates all QueryNodes for executeQuery
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
		let where = this.parsedRawQuery.WHERE, key = Object.keys(where);
		if (key.length === 0) {
			return;
		}
		let queue: object[] = [];
		queue.push(where);
		this.handleFilters(queue);
	}

	// checks if id matches currDataset, sets it if currDataset empty
	private checkDatasetID(id: string) {
		if (!this.datasetTypes.get(id)) {
			throw new InsightError("Dataset not found");
		}
		if (this.currDataset === "") {
			this.currDataset = id;
			this.sectionsDataset = this.datasetTypes.get(id) === InsightDatasetKind.Sections;
		} else if (this.currDataset !== id) {
			throw new InsightError("Referencing two datasets");
		}
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
		this.checkDatasetID(components[0]);
		return components[1];
	}

	// checks syntax, calls checkColumns, and checkOrder if it exists
	// can throw InsightError
	public checkOptions() {
		let options = this.parsedRawQuery.OPTIONS, keys = Object.keys(options);
		if (keys.length === 0 || keys.length > 2 || keys[0] !== "COLUMNS" ||
			(keys.length === 2 && keys[1] !== "ORDER")) {
			throw new InsightError("Invalid OPTIONS key");
		}
		this.checkColumns(options.COLUMNS);
		if (keys.length === 2) {
			this.checkOrder(options.ORDER);
		}
	}

	// checks syntax of transformation query, including checking GROUP and APPLY
	public checkTransformations() {
		if (Object.keys(this.parsedRawQuery).length !== 3) { // no TRANSFORMATIONS body
			this.transformations = [[],[]]; // empty transformations
			return;
		}
		let transformations = this.parsedRawQuery.TRANSFORMATIONS, keys = Object.keys(transformations);
		if (keys.length !== 2 || keys[0] !== "GROUP" || keys[1] !== "APPLY") {
			throw new InsightError("Invalid TRANSFORMATIONS body");
		}
		let transformKeys = transformations.GROUP;
		if (!Array.isArray(transformKeys) || transformKeys.length === 0 || typeof transformKeys[0] !== "string") {
			throw new InsightError("GROUP invalid array");
		}
		for (let i = 0; i < transformKeys.length; i++) {
			let curr = transformKeys[i];
			let parts = curr.split("_");
			if (parts.length !== 2) {
				throw new InsightError("invalid GROUP array key: " + i);
			}
			transformKeys[i] = parts[1];
		}
		let groupKeys: string[] = [...transformKeys];
		this.transformations.push(groupKeys);
		let apply = transformations.APPLY, applyRules: string[] = [];
		if (!Array.isArray(apply) || (apply.length > 0 && typeof apply[0] !== "object")) {
			throw new InsightError("APPLY invalid array");
		}
		for (let rule of apply) {
			let ruleKey = Object.keys(rule);
			if (ruleKey.length !== 1) {
				throw new InsightError("Invalid APPLYRULE");
			}
			let key = ruleKey[0] as keyof typeof rule;
			if (transformKeys.includes(key) || (key as string).includes("_")) {
				throw new InsightError("Invalid APPLYKEY");
			}
			transformKeys.push(key as string);
			applyRules.push((key as string) + "__" + this.checkApplyKey(rule[key]));
		}
		this.transformations.push(applyRules);
		let queryKeys = this.queryCols;
		if (transformKeys.sort().join() !== queryKeys.sort().join()) {
			throw new InsightError("COLUMNS keys do not match TRANSFORMATION keys");
		}
	}

	// checks syntax of APPLYKEY, namely APPLYTOKEN and KEY
	public checkApplyKey(applyKey: any): string {
		let keys = Object.keys(applyKey);
		if (keys.length !== 1) {
			throw new InsightError("Invalid APPLYKEY body");
		}
		if (keys[0] !== "MAX" && keys[0] !== "MIN" && keys[0] !== "AVG" && keys[0] !== "SUM" && keys[0] !== "COUNT") {
			throw new InsightError("Invalid APPLYTOKEN");
		}
		let calcKey = keys[0] as keyof typeof applyKey;
		let key = applyKey[calcKey], components = key.split("_");
		if (components.length !== 2) {
			throw new InsightError("Invalid APPLYTOKEN KEY format");
		}
		this.checkDatasetID(components[0]);
		if (!this.isMfield(components[1]) && (!this.isSfield(components[1]) || keys[0] !== "COUNT")) {
			throw new InsightError("Invalid APPLYTOKEN KEY value");
		}
		return keys[0] + "__" + key;
	}

	// checks syntax, adds filtered columns to queryCols
	// can throw InsightError
	public checkColumns(columns: any) {
		if (!Array.isArray(columns) || columns.length === 0 || typeof columns[0] !== "string") {
			throw new InsightError("Invalid COLUMNS format");
		}
		columns.forEach((col: string) => {
			if (col.includes("_")) {
				let components = col.split("_");
				if (components.length !== 2 || this.queryCols.includes(components[1])) {
					throw new InsightError("Invalid COLUMNS filter");
				}
				this.checkDatasetID(components[0]);
				this.queryCols.push(components[1]);
			} else {
				let keys = Object.keys(this.parsedRawQuery);
				if (keys.length !== 3) {
					throw new InsightError("Invalid COLUMNS filter: " + col);
				}
				this.queryCols.push(col);
			}
		});
	}

	// checks syntax, sets order, order must be type string
	public checkOrder(order: any) {
		if (typeof order === "string") {
			let components = order.split("_");
			if (components.length !== 2 || components[0] !== this.currDataset ||
				!this.queryCols.includes(components[1])) {
				throw new InsightError("Invalid ORDER format");
			}
			this.order = components[1];
		} else if (typeof order === "object") {
			let keys = Object.keys(order);
			if (keys.length !== 2 || keys[0] !== "dir" || keys[1] !== "keys") {
				throw new InsightError("ORDER object doesn't contain the right keys");
			}
			if (order.dir !== "UP" && order.dir !== "DOWN") {
				throw new InsightError("dir not UP or DOWN");
			}
			let fullOrder: string = order.dir;
			if (!Array.isArray(order.keys) || order.keys.length === 0) {
				throw new InsightError("invalid keys array");
			}
			for (let key of order.keys) {
				let components = key.split("_");
				if (!this.queryCols.includes(components[1])) {
					throw new InsightError("invalid key: " + components[1]);
				}
				fullOrder += "_" + components[1];
			}
			this.order = fullOrder;
		} else {
			throw new InsightError("ORDER not string or object");
		}
	}
}
