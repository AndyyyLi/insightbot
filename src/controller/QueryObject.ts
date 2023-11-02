import QueryNode from "./QueryNode";

export default class QueryObject {
	private datasetID: string;
	private queryNodes: QueryNode[];
	private queryCols: string[];
	private order: string;
	private transformations: string[][]; // [0] contains GROUP array, [1] contains APPLY array

	constructor(id: string, nodes: QueryNode[], cols: string[], order: string, transformations: string[][]) {
		this.datasetID = id;
		this.queryNodes = nodes;
		this.queryCols = cols;
		this.order = order;
		this.transformations = transformations;
	}

	public getDatasetID() {
		return this.datasetID;
	}

	public getQueryNodes() {
		return this.queryNodes;
	}

	public getQueryCols() {
		return this.queryCols;
	}

	public getGroup() {
		return this.transformations[0];
	}

	public getApply() {
		return this.transformations[1];
	}

	public getOrder() {
		return this.order;
	}
}
