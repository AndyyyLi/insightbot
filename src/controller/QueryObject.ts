import QueryNode from "./QueryNode";

export default class QueryObject {
	private datasetID: string;
	private queryNodes: QueryNode[];
	private queryCols: string[];
	private order: string;

	constructor(id: string, nodes: QueryNode[], cols: string[], order: string) {
		this.datasetID = id;
		this.queryNodes = nodes;
		this.queryCols = cols;
		this.order = order;
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

	public getOrder() {
		return this.order;
	}
}
