export default class QueryNode {
	private readonly filter: string;
	private readonly filterType: number; // 0: noncomp, 1: mcomp, 2: scomp
	private readonly body: number[] | number | string;

	constructor(filter: string, filterType: number, body: number[] | number | string) {
		this.filter = filter;
		this.filterType = filterType;
		this.body = body;
	}

	// getters
	public getFilter() {
		return this.filter;
	}

	public getFilterType() {
		return this.filterType;
	}

	public getBody() {
		return this.body;
	}

	// adds an index of a child in its corresponding QueryNode[]
	public pushIntoBody(idx: number) {
		if (this.filterType === 0) {
			(this.body as number[]).push(idx);
		}
	}
}
