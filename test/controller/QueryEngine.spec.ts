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
	let queryEngine: QueryEngine | undefined;
	let queryValidator: QueryValidator;
	let sampleDatasetTypes: Map<string, InsightDatasetKind>;

	before(() => {
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
			]],
			["rooms", [
				{
					fullname: "Mathematics",
					shortname: "MATH",
					number: "100",
					name: "MATH_100",
					address: "1984 Mathematics Road",
					lat: 49.266463,
					lon: -123.255534,
					seats: 240,
					type: "Tiered Large Group",
					furniture: "Classroom-Fixed Tablets",
					href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-100"
				},
				{
					fullname: "Chemistry",
					shortname: "CHEM",
					number: "B250",
					name: "CHEM_B250",
					address: "2036 Main Mall",
					lat: 49.2659,
					lon: -123.25308,
					seats: 240,
					type: "Tiered Large Group",
					furniture: "Classroom-Fixed Tablets",
					href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-B250"
				},
				{
					fullname: "Buchanan",
					shortname: "BUCH",
					number: "B141",
					name: "BUCH_B141",
					address: "1866 Main Mall",
					lat: 49.26826,
					lon: -123.25468,
					seats: 42,
					type: "Open Design General Purpose",
					furniture: "Classroom-Movable Tables & Chairs",
					href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B141"
				},
			]]
		]);

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
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
				queryValidator.checkTransformations();
				queryValidator.checkOrder("sections_instructor");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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
				queryValidator.checkTransformations();
				queryValidator.checkOrder("sections_avg");
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
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

		it("should group properly with apply COUNT", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: [
							{
								uniqueLat: {
									COUNT: "rooms_lat"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "uniqueLat"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, uniqueLat: 2},
					{rooms_seats: 42, uniqueLat: 1}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly with apply SUM", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: [
							{
								sumLat: {
									SUM: "rooms_lat"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "sumLat"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, sumLat: 98.53},
					{rooms_seats: 42, sumLat: 49.27}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly with apply MIN", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: [
							{
								minLat: {
									MIN: "rooms_lat"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "minLat"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, minLat: 49.2659},
					{rooms_seats: 42, minLat: 49.26826}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly with apply MAX", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: [
							{
								maxLat: {
									MAX: "rooms_lat"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "maxLat"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, maxLat: 49.266463},
					{rooms_seats: 42, maxLat: 49.26826}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly with apply AVG", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: [
							{
								avgLat: {
									AVG: "rooms_lat"
								}
							}
						]
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "avgLat"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, avgLat: 49.27},
					{rooms_seats: 42, avgLat: 49.27}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly on multiple keys without applying any calculations", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats",
							"rooms_shortname"
						],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats", "rooms_shortname"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240, rooms_shortname: "MATH"},
					{rooms_seats: 240, rooms_shortname: "CHEM"},
					{rooms_seats: 42, rooms_shortname: "BUCH"}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should group properly without applying any calculations", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_seats"
						],
						APPLY: []
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_seats"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_seats: 240},
					{rooms_seats: 42}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should successfully query rooms", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
						NOT: {
							IS: {
								rooms_shortname: "BUCH"
							}
						}
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns(["rooms_number"]);
				queryValidator.checkTransformations();
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE and OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.contain.members([
					{rooms_number: "100"},
					{rooms_number: "B250"}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should successfully add rooms meeting valid query with ORDER DOWN", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"rooms_fullname",
					"rooms_seats"
				]);
				queryValidator.checkTransformations();
				queryValidator.checkOrder({
					dir: "DOWN",
					keys: [
						"rooms_seats",
						"rooms_fullname"
					]
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.equals([
					{rooms_fullname: "Mathematics", rooms_seats: 240},
					{rooms_fullname: "Chemistry", rooms_seats: 240},
					{rooms_fullname: "Buchanan", rooms_seats: 42}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});

		it("should successfully add rooms meeting valid query with ORDER UP", () => {
			try {
				queryValidator.checkNewQuery({
					WHERE: {
					},
					OPTIONS: {
					}
				}, sampleDatasetTypes);
				queryValidator.checkWhere();
				queryValidator.checkColumns([
					"rooms_address",
					"rooms_seats"
				]);
				queryValidator.checkTransformations();
				queryValidator.checkOrder({
					dir: "UP",
					keys: [
						"rooms_seats",
						"rooms_address"
					]
				});
			} catch (err) {
				assert.fail("unexpected error checking valid WHERE, OPTIONS body: " + err);
			}
			try {
				queryEngine = new QueryEngine(queryValidator.makeQueryObj());
				let result = queryEngine.executeQuery(testMap);
				expect(result).to.deep.equals([
					{rooms_address: "1866 Main Mall", rooms_seats: 42},
					{rooms_address: "1984 Mathematics Road", rooms_seats: 240},
					{rooms_address: "2036 Main Mall", rooms_seats: 240}
				]);
			} catch (err) {
				assert.fail("unexpected error: " + err);
			}
		});
	});
});
