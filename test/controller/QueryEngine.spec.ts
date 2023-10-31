import {
	InsightDatasetKind,
	InsightError,
	InsightResult
} from "../../src/controller/IInsightFacade";
import QueryEngine from "../../src/controller/QueryEngine";
import {assert, expect} from "chai";
import QueryNode from "../../src/controller/QueryNode";
import QueryValidator from "../../src/controller/QueryValidator";

describe("QueryEngine", () => {
	let queryEngine: QueryEngine;
	let queryValidator: QueryValidator;
	let sampleDatasetTypes: Map<string, InsightDatasetKind>;

	before(() => {
		queryEngine = new QueryEngine();
		queryValidator = new QueryValidator();
		sampleDatasetTypes = new Map<string, InsightDatasetKind>();
		sampleDatasetTypes.set("sections", InsightDatasetKind.Sections);
		sampleDatasetTypes.set("rooms", InsightDatasetKind.Rooms);
	});

	describe("Meets Filter Reqs", () => {
		let sampleSection: InsightResult = {
			title:"comptn, progrmng",
			uuid:"1248",
			instructor:"kiczales, gregor",
			audit:0,
			year:2014,
			course:"110",
			pass:180,
			fail:38,
			avg:71.07,
			dept:"cpsc"
		};

		it("(makeInsightResult) should successfully create InsightResult from valid section", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkColumns([
					"sections_avg",
					"sections_dept"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid COLUMNS: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual = queryEngine.makeInsightResult(sampleSection);
			expect(actual).to.deep.equals({
				sections_avg: 71.07,
				sections_dept: "cpsc"
			});
		});

		it("should return true with valid GT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						GT: {
							sections_avg: 71
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("GT_avg", 1, 71));
			expect(actual).to.be.true;
		});

		it("should return false with valid GT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						GT: {
							sections_avg: 72
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("GT_avg", 1, 72));
			expect(actual).to.be.false;
		});

		it("should return true with valid LT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						LT: {
							sections_avg: 72
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("LT_avg", 1, 72));
			expect(actual).to.be.true;
		});

		it("should return false with valid LT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						LT: {
							sections_avg: 71
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("LT_avg", 1, 71));
			expect(actual).to.be.false;
		});

		it("should return true with valid EQ filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 71.07
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("EQ_avg", 1, 71.07));
			expect(actual).to.be.true;
		});

		it("should return true with valid EQ filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 71.06
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("EQ_avg", 1, 71.06));
			expect(actual).to.be.false;
		});

		it("should return true with valid IS filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_dept: "cpsc"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("IS_dept", 2, "cpsc"));
			expect(actual).to.be.true;
		});

		it("should return false with valid IS filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_dept: "math"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("IS_dept", 2, "math"));
			expect(actual).to.be.false;
		});

		it("should return true with valid AND filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						AND: [
							{
								IS: {
									sections_dept: "cpsc"
								}
							},
							{
								GT: {
									sections_avg: 71
								}
							}
						]
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("AND", 0, [1,2]));
			expect(actual).to.be.true;
		});

		it("should return true with valid AND inside OR", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						OR: [
							{
								AND: [
									{
										GT: {
											sections_avg: 71
										}
									},
									{
										IS: {
											sections_dept: "cpsc"
										}
									}
								]
							},
							{
								EQ: {
									sections_avg: 71
								}
							}
						]
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("OR", 0, [1,2]));
			expect(actual).to.be.true;
		});

		it("should return false with valid AND filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						AND: [
							{
								IS: {
									sections_dept: "cpsc"
								}
							},
							{
								GT: {
									sections_avg: 72
								}
							}
						]
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("AND", 0, [1,2]));
			expect(actual).to.be.false;
		});

		it("should return true with valid OR filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						OR: [
							{
								IS: {
									sections_dept: "math"
								}
							},
							{
								GT: {
									sections_avg: 70
								}
							}
						]
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("OR", 0, [1,2]));
			expect(actual).to.be.true;
		});

		it("should return false with valid OR filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						OR: [
							{
								IS: {
									sections_dept: "math"
								}
							},
							{
								GT: {
									sections_avg: 72
								}
							}
						]
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("OR", 0, [1,2]));
			expect(actual).to.be.false;
		});

		it("should return true with valid NOT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "math"
							}
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("NOT", 0, [1]));
			expect(actual).to.be.true;
		});

		it("should return false with valid NOT filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "cpsc"
							}
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			queryEngine.importQueryObject(queryValidator.makeQueryObj());
			let actual =
				queryEngine.meetsFilterReqs(sampleSection, new QueryNode("NOT", 0, [1]));
			expect(actual).to.be.false;
		});

		it("should throw InsightError with invalid asterisk IS filter", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "g*regor"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.meetsFilterReqs(sampleSection,
					new QueryNode("IS_instructor", 2, "g*regor"));
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should return true with valid IS filter with front asterisk", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "*gregor"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection,
				new QueryNode("IS_instructor", 2, "*gregor"));
			expect(actual).to.be.true;
		});

		it("should return true with valid IS filter with end asterisk", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "kiczales*"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection,
				new QueryNode("IS_instructor", 2, "kiczales*"));
			expect(actual).to.be.true;
		});

		it("should return true with valid IS filter with double asterisks", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "*ales*"
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection,
				new QueryNode("IS_instructor", 2, "*ales*"));
			expect(actual).to.be.true;
		});
	});

	describe("Execute Query", () => {
		let testMap = new Map<string, InsightResult[]>([
			["sections", [
				{
					title:"comptn, progrmng",
					uuid:"1248",
					instructor:"kiczales, gregor",
					audit:0,
					year:2014,
					course:"110",
					pass:180,
					fail:38,
					avg:71.07,
					dept:"cpsc"
				},
				{
					title:"thesis",
					uuid:"46405",
					instructor:"",
					audit:0,
					year:2013,
					course:"599",
					pass:1,
					fail:0,
					avg:98,
					dept:"crwr"
				},
				{
					avg:71.1,
					pass:251,
					fail:24,
					audit:0,
					year:2007,
					dept:"biol",
					id:"112",
					instructor:"gordon, joyce",
					title:"biol bact cell",
					uuid:"18026"
				},
			]]
		]);

		it("should throw InsightError on referencing nonexistent dataset", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								section_dept: "math"
							}
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.importQueryObject(queryValidator.makeQueryObj());
				queryEngine.executeQuery(testMap);
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should successfully add sections meeting valid query", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "cpsc"
							}
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["sections_dept"]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine.importQueryObject(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{sections_dept: "biol"},
					{sections_dept: "crwr"}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should successfully add sections meeting valid query with sfield ORDER", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_dept",
					"sections_instructor"
				]);
				queryValidator.checkOrder("sections_instructor");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine.importQueryObject(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.equals([
					{sections_dept: "crwr", sections_instructor: ""},
					{sections_dept: "biol", sections_instructor: "gordon, joyce"},
					{sections_dept: "cpsc", sections_instructor: "kiczales, gregor"}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should successfully add sections meeting valid query with mfield ORDER", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_dept",
					"sections_avg"
				]);
				queryValidator.checkOrder("sections_avg");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine.importQueryObject(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.equals([
					{sections_dept: "cpsc", sections_avg: 71.07},
					{sections_dept: "biol", sections_avg: 71.1},
					{sections_dept: "crwr", sections_avg: 98}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
	});
});
