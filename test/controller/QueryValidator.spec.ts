import {
	InsightDatasetKind,
	InsightError
} from "../../src/controller/IInsightFacade";
import {assert, expect} from "chai";
import QueryValidator from "../../src/controller/QueryValidator";

describe("QueryValidator", () => {
	let queryValidator: QueryValidator;
	let sampleDatasetTypes: Map<string, InsightDatasetKind>;

	before(() => {
		queryValidator = new QueryValidator();
		sampleDatasetTypes = new Map<string, InsightDatasetKind>();
		sampleDatasetTypes.set("sections", InsightDatasetKind.Sections);
		sampleDatasetTypes.set("rooms", InsightDatasetKind.Rooms);
	});

	describe("Check New Query", function () {
		it("should throw InsightError on null and non-object queries", () => {
			try {
				queryValidator.checkNewQuery({}, sampleDatasetTypes);
				assert.fail("expected InsightError on null");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery("some query", sampleDatasetTypes);
				assert.fail("expected InsightError on non-object");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError on improper key length",  () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 97
						}
					}
				}, sampleDatasetTypes);
				assert.fail("expected InsightError with key length < 2");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
				assert.fail("expected InsightError with key length > 2");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with invalid query keys", () => {
			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
				assert.fail("expected InsightError with no WHERE");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
				assert.fail("expected InsightError with no OPTIONS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should successfully reset values with valid query", () => {
			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
	});

	describe("Check WHERE", () => {
		it("should throw InsightError when body has > 1 keys", () => {
			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				assert.fail("expected InsightError");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should return if WHERE body empty", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg",
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should call handleFilters properly which throws InsightError", () => {
			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error at checking query: " + err);
			}

			try {
				queryValidator.checkWhere();
				assert.fail("expected error at checking WHERE");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("Check Handle Filter", () => {
		it("should throw InsightError with empty LOGIC body or empty filter object body", function () {
			try {
				queryValidator.handleFilters([{AND: []}]);
				assert.fail("expected error at checking empty logic body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.handleFilters([{AND: [{}]}]);
				assert.fail("expected error at checking empty filter object body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept LOGIC bodies with 1 and 2 filters", () => {
			try {
				queryValidator.handleFilters([{
					OR: [
						{
							IS: {
								sections_dept: "cpsc"
							}
						}
					]
				}]);
			} catch (err) {
				assert.fail("unexpected error with 1 LOGIC: " + err);
			}
			try {
				queryValidator.handleFilters([{
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
				}]);
			} catch (err) {
				assert.fail("unexpected error with 2 LOGIC: " + err);
			}
		});

		it("should throw InsightError with improper NEGATION body size", () => {
			try {
				queryValidator.handleFilters([{NOT: []}]);
				assert.fail("expected error with empty NEGATION body");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.handleFilters([{
					NOT: {
						IS: {
							sections_dept: "cpsc"
						},
						OR: {
							sections_dept: "math"
						}
					}
				}]);
				assert.fail("expected error with NEGATION body > 1");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept proper NEGATION body", () => {
			try {
				queryValidator.handleFilters([{
					NOT: {
						IS: {
							sections_dept: "cpsc"
						}
					}
				}]);
			} catch (err) {
				assert.fail("unexpected error with NEGATION: " + err);
			}
		});

		it("should throw InsightError if comparison key object invalid", () => {
			try {
				queryValidator.verifyCompKeyReturnField([]);
				assert.fail("expected error with empty key");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.verifyCompKeyReturnField(["key1", "key2"]);
				assert.fail("expected error with key size > 1");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.verifyCompKeyReturnField(["key1"]);
				assert.fail("expected error with 1 component");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.verifyCompKeyReturnField(["k_e_y_1"]);
				assert.fail("expected error with > 2 components");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly set currDataset then throw InsightError on encountering new ID", () => {
			try {
				let field = queryValidator.verifyCompKeyReturnField(["sections_avg"]);
				expect(field).to.equals("avg");
			} catch (err) {
				assert.fail("unexpected error setting dataset: " + err);
			}
			try {
				queryValidator.verifyCompKeyReturnField(["sections2_avg"]);
				assert.fail("expected error with second dataset");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError when comp key and value not matching", () => {
			try {
				queryValidator.handleFilters([{
					EQ: {
						sections_avg: "96"
					}
				}]);
				assert.fail("expected error with string value for mcomp");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.handleFilters([{
					IS: {
						sections_id: 310
					}
				}]);
				assert.fail("expected error with number value for scomp");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on referencing nonexistent dataset", () => {
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
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("Check Options, Columns, and Sort Order", () => {
		it("should throw InsightError when there are 0 keys in options", () => {
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
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkOptions();
				assert.fail("expected error checking 0 options keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError when there are > 2 keys in options", () => {
			try {
				queryValidator.checkNewQuery({
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
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkOptions();
				assert.fail("expected error checking > 2 options keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError if first key isn't COLUMNS", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMN: []
					}
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkOptions();
				assert.fail("expected error checking first key not COLUMNS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError if second key isn't ORDER", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [],
						ORDERS: []
					}
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkOptions();
				assert.fail("expected error checking second key not ORDER");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept valid OPTIONS keys in checkOptions but invalid bodies", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
						COLUMNS: [],
						ORDER: ""
					}
				}, sampleDatasetTypes);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkOptions();
				assert.fail("expected error checking valid OPTIONS keys from checkColumns");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with empty COLUMNS in checkColumns", () => {
			try {
				queryValidator.checkColumns([]);
				assert.fail("expected error checking empty COLUMNS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with types not string[] in checkColumns", () => {
			try {
				queryValidator.checkColumns("not string[]");
				assert.fail("expected error checking COLUMNS with non-array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.checkColumns([21, 14]);
				assert.fail("expected error checking COLUMNS with array of not string");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with different datasetid in checkColumns", () => {
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
				queryValidator.checkColumns(["section_avg"]);
				assert.fail("expected error checking COLUMNS with different datasetid");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with duplicate COLUMNS filters in checkColumns", () => {
			try {
				queryValidator.checkColumns([
					"sections_avg",
					"sections_avg"
				]);
				assert.fail("expected error checking COLUMNS with duplicate COLUMNS filters");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with filter without underscore without TRANSFORMATIONS", () => {
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
					"overallAvg"
				]);
				assert.fail("expected error checking invalid filter names");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly add valid filters in COLUMNS", () => {
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
				assert.fail("unexpected error: " + err);
			}
		});

		it("should throw InsightError with invalid ORDER syntax", () => {
			try {
				queryValidator.checkOrder(123);
				assert.fail("expected error checking ORDER with non-string");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.checkOrder("sections-avg");
				assert.fail("expected error checking ORDER with != 2 components");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError when ORDER has different id or filter not in cols", () => {
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
			try {
				queryValidator.checkOrder("section_avg");
				assert.fail("expected error checking different ORDER id");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				queryValidator.checkOrder("sections_id");
				assert.fail("expected error checking filter not in cols");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw InsightError with invalid ORDER object", () => {
			try {
				queryValidator.checkOrder({});
				assert.fail("expected error checking ORDER with empty object");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkOrder({dir: "LEFT", keys: ["sections_avg"]});
				assert.fail("expected error checking ORDER with incorrect dir");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkOrder({dir: "UP", keys: []});
				assert.fail("expected error checking ORDER with empty keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkOrder({dir: "UP", keys: 123});
				assert.fail("expected error checking ORDER with non-array keys");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkOrder({dir: "UP", keys: ["sections_avg", "sections_uuid"]});
				assert.fail("expected error checking 2nd key not in cols");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject on checking keys not in cols", () => {
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

			try {
				queryValidator.checkOrder({dir: "DOWN", keys: ["sections_id"]});
				assert.fail("expected error checking keys not in cols");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should properly set order with valid ORDER object", () => {
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
			try {
				queryValidator.checkOrder({dir: "UP", keys: ["sections_dept", "sections_avg"]});
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should properly set order with valid ORDER", () => {
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
			try {
				queryValidator.checkOrder("sections_avg");
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
	});

	describe("Check Transformations", () => {
		it("should throw error on invalid body", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking empty TRANSFORMATIONS");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GOOP: [],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking not GROUP");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [],
						APPLE: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking not APPLY");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid GROUP array", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: "sections_avg",
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking non-array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking empty array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [1,2,3],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking non-string array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid APPLY array", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_dept"],
						APPLY: 123
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking non-array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_dept"],
						APPLY: [123]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking non-object array");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid APPLYKEY", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_dept"],
						APPLY: [
							{
								test1: 123,
								test2: 456
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking object with > 1 properties");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_dept"],
						APPLY: [
							{}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking empty object");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_dept"],
						APPLY: [
							{
								overall_avg: {}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking incorrect APPLYKEY format");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid APPLYKEY", () => {
			try {
				queryValidator.checkApplyKey({});
				assert.fail("expected error checking empty object");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid APPLYTOKEN", () => {
			try {
				queryValidator.checkApplyKey({LOW: "sections_avg"});
				assert.fail("expected error checking incorrect key");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on invalid KEY", () => {
			try {
				queryValidator.checkApplyKey({MAX: "sectionsavg"});
				assert.fail("expected error checking incorrect KEY format");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkApplyKey({MAX: "sections_uuid"});
				assert.fail("expected error checking incorrect KEY format");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkApplyKey({MAX: "sections_test"});
				assert.fail("expected error checking incorrect KEY format");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept proper APPLYKEYS", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_avg"],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE body: " + err);
			}
			try {
				queryValidator.checkApplyKey({MAX: "sections_avg"});
			} catch (err) {
				assert.fail("unexpected error checking proper numeric apply");
			}

			try {
				queryValidator.checkApplyKey({COUNT: "sections_uuid"});
			} catch (err) {
				assert.fail("unexpected error checking proper COUNT with string");
			}

			try {
				queryValidator.checkApplyKey({COUNT: "sections_id"});
			} catch (err) {
				assert.fail("unexpected error checking proper COUNT with number");
			}
		});

		it("should throw error on COLUMNS and TRANSFORMATIONS mismatch", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_id"],
						APPLY: [
							{
								overallAvg: {
									AVG: "sections_avg"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_avg",
					"overallAvg"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and COLUMNS: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking mismatch");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}

			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_avg"],
						APPLY: [
							{
								overall_avg: {
									AVG: "sections_avg"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_avg",
					"overallAvg"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and COLUMNS: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking mismatch");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on duplicate APPLYKEYs", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_avg"],
						APPLY: [
							{
								overallAvg: {
									AVG: "sections_avg"
								}
							},
							{
								overallAvg: {
									MAX: "sections_avg"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_avg",
					"overallAvg",
					"overallAvg"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and COLUMNS: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking duplicate APPLYKEYs");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should throw error on APPLYKEY with underscore", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						EQ: {
							sections_avg: 98
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_avg"],
						APPLY: [
							{
								sections_pass: {
									SUM: "sections_pass"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_avg",
					"sections_pass"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and COLUMNS: " + err);
			}
			try {
				queryValidator.checkTransformations();
				assert.fail("expected error checking APPLYKEY with underscore");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should accept valid TRANSFORMATIONS", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						GT: {
							sections_pass: 1000
						}
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: ["sections_avg"],
						APPLY: [
							{
								overallAvg: {
									AVG: "sections_avg"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"sections_avg",
					"overallAvg"
				]);
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and COLUMNS: " + err);
			}
			try {
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid TRANSFORMATIONS: " + err);
			}
		});
	});
});
