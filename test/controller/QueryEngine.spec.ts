import {
	InsightError,
	InsightResult, ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import QueryEngine from "../../src/controller/QueryEngine";
import {assert, expect} from "chai";

describe("QueryEngine", () => {
	let queryEngine: QueryEngine;

	before(() => {
		queryEngine = new QueryEngine();
	});

	describe("Check New Query", function () {
		it("should throw InsightError on null and non-object queries", () => {
			try {
				queryEngine.checkNewQuery({});
				assert.fail("expected InsightError on null");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryEngine.checkNewQuery("some query");
				assert.fail("expected InsightError on non-object");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError on improper key length",  () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 97
						}
					}
				});
				assert.fail("expected InsightError with key length < 2");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 97
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					},
					ORDER: "sections_avg"
				});
				assert.fail("expected InsightError with key length > 2");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with invalid query keys", () => {
			try {
				queryEngine.checkNewQuery({
					WITH: {
						EQ: {
							sections_avg: 97
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
				assert.fail("expected InsightError with no WHERE");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 97
						}
					},
					SHOW: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
				assert.fail("expected InsightError with no OPTIONS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should successfully reset values with valid query", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 97
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
	});

	describe("Check WHERE and switchFilter", () => {
		it("should throw InsightError when body has > 1 keys", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_dept: "cpsc"
						},
						EQ: {
							sections_avg: 95
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
				queryEngine.checkWhere();
				assert.fail("expected InsightError");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should return if WHERE body empty", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should call switchFilter properly which throws InsightError", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQUALS: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				});
			} catch (err) {
				assert.fail("unexpected error at checking query: " + err);
			}

			try {
				queryEngine.checkWhere();
				assert.fail("expected error at checking WHERE");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("Check switchFilter and filters", () => {
		it("should throw InsightError with empty LOGIC body or empty filter object body", function () {
			try {
				queryEngine.switchFilter({AND: []}, "AND", "");
				assert.fail("expected error at checking empty logic body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryEngine.switchFilter({AND: [{}]}, "AND", "");
				assert.fail("expected error at checking empty filter object body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept LOGIC bodies with 1 and 2 filters", () => {
			try {
				queryEngine.switchFilter({
					OR: [
						{
							IS: {
								sections_dept: "cpsc"
							}
						}
					]
				}, "OR", "");
			} catch (err) {
				assert.fail("unexpected error with 1 LOGIC: " + err);
			}
			try {
				queryEngine.switchFilter({
					AND: [
						{
							IS: {
								sections_dept: "cpsc"
							}
						},
						{
							IS: {
								sections_dept: "math"
							}
						}
					]
				}, "AND", "");
			} catch (err) {
				assert.fail("unexpected error with 2 LOGIC: " + err);
			}
		});

		it("should throw InsightError with improper NEGATION body size", () => {
			try {
				queryEngine.switchFilter({NOT: []}, "NOT", "");
				assert.fail("expected error with empty NEGATION body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.switchFilter({
					NOT: {
						IS: {
							sections_dept: "cpsc"
						},
						OR: {
							sections_dept: "math"
						}
					}
				}, "NOT", "");
				assert.fail("expected error with NEGATION body > 1");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept proper NEGATION body", () => {
			try {
				queryEngine.switchFilter({
					NOT: {
						IS: {
							sections_dept: "cpsc"
						}
					}
				}, "NOT", "");
			} catch (err) {
				assert.fail("unexpected error with NEGATION: " + err);
			}
		});

		it("should throw InsightError if comparison key object invalid", () => {
			try {
				queryEngine.verifyCompKeyReturnField([]);
				assert.fail("expected error with empty key");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.verifyCompKeyReturnField(["key1", "key2"]);
				assert.fail("expected error with key size > 1");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.verifyCompKeyReturnField(["key1"]);
				assert.fail("expected error with 1 component");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.verifyCompKeyReturnField(["k_e_y_1"]);
				assert.fail("expected error with > 2 components");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly set currDataset then throw InsightError on encountering new ID", () => {
			try {
				let field = queryEngine.verifyCompKeyReturnField(["sections_avg"]);
				expect(field).to.equals("avg");
			} catch (err) {
				assert.fail("unexpected error setting dataset: " + err);
			}
			try {
				queryEngine.verifyCompKeyReturnField(["sections2_avg"]);
				assert.fail("expected error with second dataset");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should check MCOMPs properly", () => {
			try {
				queryEngine.checkComparison({sections_avg: 96}, "", "LT");
			} catch (err) {
				assert.fail("unexpected error with LT: " + err);
			}
			try {
				queryEngine.checkComparison({sections_avg: 96}, "", "GT");
			} catch (err) {
				assert.fail("unexpected error with GT: " + err);
			}
			try {
				queryEngine.checkComparison({sections_avg: 96}, "", "EQ");
			} catch (err) {
				assert.fail("unexpected error with EQ: " + err);
			}
		});

		it("should check SCOMP properly", () => {
			queryEngine = new QueryEngine();
			try {
				queryEngine.checkComparison({sections_dept: "cpsc"}, "");
			} catch (err) {
				assert.fail("unexpected error with IS: " + err);
			}
		});

		it("should throw InsightError when comp key and value not matching", () => {
			try {
				queryEngine.checkComparison({sections_avg: "96"}, "", "EQ");
				assert.fail("expected error with string value for mcomp");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.checkComparison({sections_id: 310}, "");
				assert.fail("expected error with number value for scomp");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("Check Options, Columns, and Order", () => {
		it("should throw InsightError when there are 0 keys in options", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkOptions();
				assert.fail("expected error checking 0 options keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError when there are > 2 keys in options", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [],
						ROWS: [],
						DIAGONALS: []
					}
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkOptions();
				assert.fail("expected error checking > 2 options keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError if first key isn't COLUMNS", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMN: []
					}
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkOptions();
				assert.fail("expected error checking first key not COLUMNS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError if second key isn't ORDER", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [],
						ORDERS: []
					}
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkOptions();
				assert.fail("expected error checking second key not ORDER");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept valid OPTIONS keys in checkOptions but invalid bodies", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [],
						ORDER: ""
					}
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkOptions();
				assert.fail("expected error checking valid OPTIONS keys from checkColumns");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with empty COLUMNS in checkColumns", () => {
			try {
				queryEngine.checkColumns([]);
				assert.fail("expected error checking empty COLUMNS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with != 2 components in checkColumns", () => {
			try {
				queryEngine.checkColumns(["sections-avg"]);
				assert.fail("expected error checking COLUMNS with != 2 components");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with types not string[] in checkColumns", () => {
			try {
				queryEngine.checkColumns("not string[]");
				assert.fail("expected error checking COLUMNS with non-array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.checkColumns([21, 14]);
				assert.fail("expected error checking COLUMNS with array of not string");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with different datasetid in checkColumns", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkColumns(["section_avg"]);
				assert.fail("expected error checking COLUMNS with different datasetid");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with duplicate COLUMNS filters in checkColumns", () => {
			try {
				queryEngine.checkColumns([
					"sections_avg",
					"sections_avg"
				]);
				assert.fail("expected error checking COLUMNS with duplicate COLUMNS filters");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly add valid filters in COLUMNS", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkColumns([
					"sections_avg",
					"sections_dept"
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should throw InsightError with invalid ORDER syntax", () => {
			try {
				queryEngine.checkOrder(123);
				assert.fail("expected error checking ORDER with non-string");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.checkOrder("sections-avg");
				assert.fail("expected error checking ORDER with != 2 components");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError when ORDER has different id or filter not in cols", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkColumns([
					"sections_avg",
					"sections_dept"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid COLUMNS: " + err);
			}
			try {
				queryEngine.checkOrder("section_avg");
				assert.fail("expected error checking different ORDER id");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryEngine.checkOrder("sections_id");
				assert.fail("expected error checking filter not in cols");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly set order with valid ORDER", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkColumns([
					"sections_avg",
					"sections_dept"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid COLUMNS: " + err);
			}
			try {
				queryEngine.checkOrder("sections_avg");
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
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
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.checkColumns([
					"sections_avg",
					"sections_dept"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid COLUMNS: " + err);
			}
			let actual = queryEngine.makeInsightResult(sampleSection);
			expect(actual).to.deep.equals({
				sections_avg: 71.07,
				sections_dept: "cpsc"
			});
		});

		it("should return true with valid GT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						GT: {
							sections_avg: 71
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "GT_avg");
			expect(actual).to.be.true;
		});

		it("should return false with valid GT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						GT: {
							sections_avg: 72
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "GT_avg");
			expect(actual).to.be.false;
		});

		it("should return true with valid LT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						LT: {
							sections_avg: 72
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "LT_avg");
			expect(actual).to.be.true;
		});

		it("should return false with valid LT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						LT: {
							sections_avg: 71
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "LT_avg");
			expect(actual).to.be.false;
		});

		it("should return true with valid EQ filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 71.07
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "EQ_avg");
			expect(actual).to.be.true;
		});

		it("should return true with valid EQ filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 71.06
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "EQ_avg");
			expect(actual).to.be.false;
		});

		it("should return true with valid IS filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_dept: "cpsc"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "dept");
			expect(actual).to.be.true;
		});

		it("should return false with valid IS filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_dept: "math"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "dept");
			expect(actual).to.be.false;
		});

		it("should return true with valid AND filter", () => {
			try {
				queryEngine.checkNewQuery({
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
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "AND_dept") &&
				queryEngine.meetsFilterReqs(sampleSection, "AND_GT_avg");
			expect(actual).to.be.true;
		});

		it("should return false with valid AND filter", () => {
			try {
				queryEngine.checkNewQuery({
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
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "AND_dept") &&
				queryEngine.meetsFilterReqs(sampleSection, "AND_GT_avg");
			expect(actual).to.be.false;
		});

		it("should return true with valid OR filter", () => {
			try {
				queryEngine.checkNewQuery({
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
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "OR_dept") ||
				queryEngine.meetsFilterReqs(sampleSection, "OR_GT_avg");
			expect(actual).to.be.true;
		});

		it("should return false with valid OR filter", () => {
			try {
				queryEngine.checkNewQuery({
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
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "OR_dept") ||
				queryEngine.meetsFilterReqs(sampleSection, "OR_GT_avg");
			expect(actual).to.be.false;
		});

		it("should return true with valid NOT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "math"
							}
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "NOT_dept");
			expect(actual).to.be.true;
		});

		it("should return false with valid NOT filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "cpsc"
							}
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "NOT_dept");
			expect(actual).to.be.false;
		});

		it("should throw InsightError with invalid asterisk IS filter", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "g*regor"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.meetsFilterReqs(sampleSection, "instructor");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should return true with valid IS filter with front asterisk", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "*gregor"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "instructor");
			expect(actual).to.be.true;
		});

		it("should return true with valid IS filter with end asterisk", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "kiczales*"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "instructor");
			expect(actual).to.be.true;
		});

		it("should return true with valid IS filter with double asterisks", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						IS: {
							sections_instructor: "*ales*"
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			let actual = queryEngine.meetsFilterReqs(sampleSection, "instructor");
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
				queryEngine.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								section_dept: "math"
							}
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryEngine.executeQuery(testMap);
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should successfully add sections meeting valid query", () => {
			try {
				queryEngine.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								sections_dept: "cpsc"
							}
						}
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
				queryEngine.checkColumns(["sections_dept"]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
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
				queryEngine.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
				queryEngine.checkColumns([
					"sections_dept",
					"sections_instructor"
				]);
				queryEngine.checkOrder("sections_instructor");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
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
				queryEngine.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				});
				queryEngine.checkWhere();
				queryEngine.checkColumns([
					"sections_dept",
					"sections_avg"
				]);
				queryEngine.checkOrder("sections_avg");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
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
