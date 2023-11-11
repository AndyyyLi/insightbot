import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import path from "path";
import fs from "fs-extra";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sectionsSmall: string;
	let rooms: string;
	let roomsOne: string;

	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");
		sectionsSmall = getContentFromArchives("pairSmall.zip");
		rooms = getContentFromArchives("campus.zip");
		roomsOne = getContentFromArchives("campusOneValidRoom.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
			clearDisk();
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			clearDisk();
		});

		describe("Add Dataset", function () {
			beforeEach(function () {
				clearDisk();
			});

			describe("Kind: Section", function () { // This is a unit test. You should create more like this!
				it("should reject addition of an empty dataset id", function () {
					const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
					return expect(result).to.eventually.be.rejectedWith(InsightError);
				});

				it("should reject addition of a dataset with an undefined EBNF id", async function () {
					try {
						await facade.addDataset("_", sections, InsightDatasetKind.Sections);
						return expect.fail("should have rejected addition of a dataset with an undefined EBNF id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of a dataset with an undefined EBNF id: character and underscore",
					async function () {
						try {
							await facade.addDataset("s_", sections, InsightDatasetKind.Sections);
							return expect.fail("should have rejected addition of a dataset with an undefined " +
								"EBNF id: char underscore");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					}
				);

				it("should reject addition of a dataset with an already added id", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						return expect.fail("should have rejected addition of a second dataset with the same id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of a dataset with invalid content", async function () {
					try {
						await facade.addDataset("sections", "", InsightDatasetKind.Sections);
						return expect.fail("should have rejected addition of a dataset with invalid content");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject the addition of a non zip file", async function () {
					try {
						await facade.addDataset("section", getContentFromArchives("invalidDatasetFile.txt"),
							InsightDatasetKind.Sections);
						return expect.fail("should have rejected the addition of a non zip file");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject the addition of a dataset with an invalid directory", async function () {
					try {
						await facade.addDataset("section", getContentFromArchives("pairInvalidDirectory.zip"),
							InsightDatasetKind.Sections);
						return expect.fail("should have rejected the addition of a dataset with an invalid directory");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject the addition of a dataset with no valid course file type and no valid section",
					async function () {
						try {
							await facade.addDataset("section", getContentFromArchives(
								"pairMixFileTypesWithNoValidSection.zip"), InsightDatasetKind.Sections);
							return expect.fail("should have rejected the addition of a dataset with an invalid course" +
								" file and invalid section");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

				it("should reject addition of a section dataset with room dataset kind", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a dataset with room dataset kind");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should successfully add a dataset", async function () {
					try {
						const result = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						return expect(result).to.deep.members(["sections"]);
					} catch (err) {
						return expect.fail("should NOT have failed valid addition of dataset" + err);
					}
				});

				it("should successfully add two datasets", async function () {
					try {
						const first = await facade.addDataset("sections1", sectionsSmall, InsightDatasetKind.Sections);
						expect(first).to.have.deep.members(["sections1"]);
						const second = await facade.addDataset("sections2", sectionsSmall, InsightDatasetKind.Sections);
						return expect(second).to.have.deep.members(["sections1", "sections2"]);
					} catch (err) {
						return expect.fail("should NOT have failed valid addition of two datasets" + err);
					}
				});

				it("should successfully add dataset that contains valid and invalid section", async function () {
					try {
						const result = await facade.addDataset("sectionValidAndInvalid", getContentFromArchives(
							"pairValidAndInvalidSection.zip"), InsightDatasetKind.Sections);
						expect(result).to.have.deep.members(["sectionValidAndInvalid"]);
						const resultList = await facade.listDatasets();
						return expect(resultList).to.have.deep.members([{
							id: "sectionValidAndInvalid",
							kind: InsightDatasetKind.Sections,
							numRows: 1
						}]);
					} catch (err) {
						return expect.fail("should NOT have failed to add dataset with valid and invalid section");
					}
				});

				it("should successfully add dataset that contains only a 'result' key and valid section",
					async function () {
						try {
							const result = await facade.addDataset("sectionValidNoRank", getContentFromArchives(
								"pairValidFileNoRank.zip"), InsightDatasetKind.Sections);
							expect(result).to.have.deep.members(["sectionValidNoRank"]);
							const resultList = await facade.listDatasets();
							return expect(resultList).to.have.deep.members([{
								id: "sectionValidNoRank",
								kind: InsightDatasetKind.Sections,
								numRows: 2
							}]);
						} catch (err) {
							return expect.fail("should NOT have failed to add dataset with valid section in 'result'");
						}
					});

				it("should successfully add dataset with valid section and invalid file type", async function () {
					try {
						const result = await facade.addDataset("sectionValidWithOtherInvalid", getContentFromArchives(
							"pairMixFileTypesWithValidSection.zip"), InsightDatasetKind.Sections);
						expect(result).to.have.deep.members(["sectionValidWithOtherInvalid"]);
						const resultList = await facade.listDatasets();
						return expect(resultList).to.have.deep.members([{
							id: "sectionValidWithOtherInvalid",
							kind: InsightDatasetKind.Sections,
							numRows: 2
						}]);
					} catch (err) {
						return expect.fail("should NOT have failed to add dataset with valid section and other" +
							" file types");
					}
				});
			});

			describe("Kind: Room", function() {
				it("should reject addition of rooms dataset with empty id", async function() {
					try {
						await facade.addDataset("", rooms, InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a dataset with an undefined EBNF id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with invalid id", async function() {
					try {
						await facade.addDataset("rooms_", rooms, InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a dataset with an undefined EBNF id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with duplicate rooms dataset id", async function() {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset with a duplicate id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with duplicate section dataset id",
					async function() {
						try {
							await facade.addDataset("dataset", sectionsSmall, InsightDatasetKind.Sections);
							await facade.addDataset("dataset", roomsOne, InsightDatasetKind.Rooms);
							return expect.fail("should have rejected addition of a rooms dataset with a duplicate id");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

				it("should reject addition of rooms dataset that is not a zip", async function() {
					try {
						await facade.addDataset("rooms",
							getContentFromArchives("invalidDatasetFile.txt"), InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset that is not a zip");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with no index.htm", async function() {
					try {
						await facade.addDataset("rooms", getContentFromArchives("campusNoIndex.zip"),
							InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset with no index.htm");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				// it("should reject addition of rooms dataset with no building table in index.htm",
				// 	async function() {
				// 		try {
				// 			await facade.addDataset("rooms", getContentFromArchives(
				// 				"campusIndexNoValidTable.zip"), InsightDatasetKind.Rooms);
				// 			return expect.fail("should have rejected addition of a rooms dataset with no building" +
				// 				" table in index.htm");
				// 		} catch (err) {
				// 			return expect(err).to.be.instanceOf(InsightError);
				// 		}
				// 	});

				it("should reject addition of rooms dataset with index.html with no table", async function() {
					try {
						await facade.addDataset("rooms", getContentFromArchives("campusIndexNoTable.zip"),
							InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset with no table in " +
							"index.htm");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with no link to a building.htm", async function() {
					try {
						await facade.addDataset("rooms", getContentFromArchives(
							"campusIndexNoBuildingColumnInTable.zip"), InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset with no link " +
							"to a building.htm");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject addition of rooms dataset with no buildings.htm",
					async function() {
						try {
							await facade.addDataset("rooms", getContentFromArchives(
								"campusNoBuildingFile.zip"), InsightDatasetKind.Rooms);
							return expect.fail("should have rejected addition of a rooms dataset with no building.htm");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

				it("should reject addition of rooms dataset with no table in a building.htm", async function() {
					try {
						await facade.addDataset("rooms", getContentFromArchives(
							"campusNoTableInBuildingFile.zip"), InsightDatasetKind.Rooms);
						return expect.fail("should have rejected addition of a rooms dataset with no table " +
							"in a building.htm");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				// it("should reject addition of rooms dataset with no rooms table in a building.htm",
				// 	async function() {
				// 		try {
				// 			await facade.addDataset("rooms", getContentFromArchives(
				// 				"campusNoValidTableInBuildingFile.zip"), InsightDatasetKind.Rooms);
				// 			return expect.fail("should have rejected addition of a rooms dataset with no" +
				// 				" rooms table in a building.htm");
				// 		} catch (err) {
				// 			return expect(err).to.be.instanceOf(InsightError);
				// 		}
				// 	});

				it("should reject addition of rooms dataset with no valid room - failed geolocation",
					async function() {
						try {
							await facade.addDataset("rooms", getContentFromArchives(
								"campusNoValidRoomFailedGeo.zip"), InsightDatasetKind.Rooms);
							return expect.fail("should have rejected addition of a rooms dataset with a rooms" +
								" table but a room with a failed geolocation");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

				it("should reject addition of rooms dataset with section kind", async function() {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Sections);
						return expect.fail("should have rejected addition of a rooms dataset with section kind");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should successfully add a rooms dataset", async function() {
					try {
						const result = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
						return expect(result).to.deep.equals(["rooms"]);
					} catch (err) {
						return expect.fail("should NOT have rejected addition of a rooms dataset");

					}
				});

				it("should successfully add multiple rooms dataset", async function() {
					try {
						await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
						const result = await facade.addDataset("rooms2", roomsOne, InsightDatasetKind.Rooms);
						return expect(result).to.deep.equals(["rooms1", "rooms2"]);
					} catch (err) {
						return expect.fail("should NOT have rejected addition of a rooms dataset");

					}
				});

				it("should successfully add minimal rooms dataset", async function() {
					try {
						const result = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						return expect(result).to.deep.equals(["rooms"]);
					} catch (err) {
						return expect.fail("should NOT have rejected addition of minimal rooms dataset" + err);

					}
				});

				it("should successfully add rooms dataset with valid and invalid rooms - missing fields",
					async function() {
						try {
							const result = await facade.addDataset("rooms", getContentFromArchives(
								"campusValidAndInvalidRooms.zip"), InsightDatasetKind.Rooms);
							return expect(result).to.deep.equals(["rooms"]);
						} catch (err) {
							return expect.fail("should NOT have rejected addition of rooms dataset with valid" +
								" and invalid room - invalid room is missing fields");
						}
					});

				it("should successfully add rooms dataset multiple buildings with valid and invalid rooms",
					async function() {
						try {
							const result = await facade.addDataset("rooms", getContentFromArchives(
								"campusManyBuildingsAndRooms.zip"), InsightDatasetKind.Rooms);
							return expect(result).to.deep.equals(["rooms"]);
						} catch (err) {
							return expect.fail("should NOT have rejected addition of rooms dataset with multiple" +
								" buildings with valid and invalid rooms within");
						}
					});
			});
		});

		describe("Remove Dataset", function () {
			describe("Kind: Section", function () {
				it("should reject removal with an empty dataset id", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						await facade.removeDataset("");
						return expect.fail("should have rejected removal with an empty dataset id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with an invalid EBNF id: underscore", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						await facade.removeDataset("_");
						return expect.fail("should have rejected removal with an invalid EBNF id: underscore");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with an invalid EBNF id: char and underscore", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						await facade.removeDataset("s_");
						return expect.fail("should have rejected removal with an invalid EBNF id: char and underscore");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with a not added valid id", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						await facade.removeDataset("ubc");
						return expect.fail("should have rejected removal with a not added valid id");
					} catch (err) {
						return expect(err).to.be.instanceOf(NotFoundError);
					}
				});

				it("should successfully remove the dataset", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						const result = await facade.removeDataset("sections");
						return expect(result).to.equals("sections");
					} catch (err) {
						return expect.fail("should NOT have failed removal of dataset");
					}
				});

				it("should successfully remove the dataset once, reject the second attempt", async function () {
					try {
						await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						const result = await facade.removeDataset("sections");
						expect(result).to.equals("sections");
						await facade.removeDataset("sections");
						return expect.fail("should NOT have been able to remove same dataset twice");
					} catch (err) {
						return expect(err).to.be.instanceOf(NotFoundError);
					}
				});

				it("should successfully remove two datasets", async function () {
					try {
						await facade.addDataset("sections1", sectionsSmall, InsightDatasetKind.Sections);
						await facade.addDataset("sections2", sectionsSmall, InsightDatasetKind.Sections);
						const removeFirst = await facade.removeDataset("sections1");
						expect(removeFirst).to.equals("sections1");
						const removeSecond = await facade.removeDataset("sections2");
						return expect(removeSecond).to.equals("sections2");
					} catch (err) {
						return expect.fail("should NOT have failed removal of multiple datasets");
					}
				});
			});

			describe("Kind: Room", function () {
				it("should reject removal with an empty dataset id", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						await facade.removeDataset("");
						return expect.fail("should have rejected removal with an empty dataset id");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with an invalid EBNF id: underscore", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						await facade.removeDataset("_");
						return expect.fail("should have rejected removal with an invalid EBNF id: underscore");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with an invalid EBNF id: char and underscore", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						await facade.removeDataset("r_");
						return expect.fail("should have rejected removal with an invalid EBNF id: char and underscore");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should reject removal with a not added valid id", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						await facade.removeDataset("ubc");
						return expect.fail("should have rejected removal with a not added valid id");
					} catch (err) {
						return expect(err).to.be.instanceOf(NotFoundError);
					}
				});

				it("should successfully remove the dataset", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						const result = await facade.removeDataset("rooms");
						return expect(result).to.equals("rooms");
					} catch (err) {
						return expect.fail("should NOT have failed removal of dataset");
					}
				});

				it("should successfully remove the dataset once, reject the second attempt", async function () {
					try {
						await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						const result = await facade.removeDataset("rooms");
						expect(result).to.equals("rooms");
						await facade.removeDataset("rooms");
						return expect.fail("should NOT have been able to remove same dataset twice");
					} catch (err) {
						return expect(err).to.be.instanceOf(NotFoundError);
					}
				});

				it("should successfully remove two datasets", async function () {
					try {
						await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
						await facade.addDataset("rooms2", roomsOne, InsightDatasetKind.Rooms);
						const removeFirst = await facade.removeDataset("rooms1");
						expect(removeFirst).to.equals("rooms1");
						const removeSecond = await facade.removeDataset("rooms2");
						return expect(removeSecond).to.equals("rooms2");
					} catch (err) {
						return expect.fail("should NOT have failed removal of multiple datasets");
					}
				});
			});

			it("should remove dataset of kind section and room", async function () {
				try {
					await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
					await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
					const removeSection = await facade.removeDataset("sections");
					expect(removeSection).to.equals("sections");
					const removeRooms = await facade.removeDataset("rooms");
					return expect(removeRooms).to.equals("rooms");
				} catch (err) {
					return expect(err).to.be.instanceOf(InsightError);
				}
			});
		});

		describe("List Dataset", function () {
			it("should successfully list, even when there is no dataset", async function () {
				try {
					const result = await facade.listDatasets();
					return expect(result).to.have.lengthOf(0);
				} catch (err) {
					return expect.fail("should NOT have failed listing the dataset");
				}
			});

			it("should successfully list a section dataset", async function () {
				try {
					await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
					const result = await facade.listDatasets();
					expect(result).to.have.deep.members([{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 104
					}]);
					return expect(result).to.have.lengthOf(1);
				} catch (err) {
					return expect.fail("should NOT have failed listing the dataset" + err);
				}
			});

			it("should successfully list multiple section datasets", async function () {
				try {
					await facade.addDataset("sections1", sectionsSmall, InsightDatasetKind.Sections);
					await facade.addDataset("sections2", sectionsSmall, InsightDatasetKind.Sections);
					const result = await facade.listDatasets();
					expect(result).to.have.deep.members(
						[{id: "sections1", kind: InsightDatasetKind.Sections, numRows: 104},
							{id: "sections2", kind: InsightDatasetKind.Sections, numRows: 104}]);
					expect(result).to.have.lengthOf(2);
					await facade.removeDataset("sections2");
					const newResult = await facade.listDatasets();
					expect(newResult).to.have.deep.members(
						[{id: "sections1", kind: InsightDatasetKind.Sections, numRows: 104}]);
					expect(newResult).to.have.lengthOf(1);
					await facade.removeDataset("sections1");
					const anotherResult = await facade.listDatasets();
					return expect(anotherResult).to.have.lengthOf(0);
				} catch (err) {
					return expect.fail("should NOT have failed listing the multiple datasets" + err);
				}
			});

			it("should successfully list a rooms dataset", async function () {
				try {
					await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
					const result = await facade.listDatasets();
					expect(result).to.have.deep.members([{
						id: "rooms",
						kind: InsightDatasetKind.Rooms,
						numRows: 1
					}]);
					return expect(result).to.have.lengthOf(1);
				} catch (err) {
					return expect.fail("should NOT have failed listing the dataset" + err);
				}
			});

			it("should successfully list multiple rooms datasets", async function () {
				try {
					await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
					await facade.addDataset("rooms2", roomsOne, InsightDatasetKind.Rooms);
					const result = await facade.listDatasets();
					expect(result).to.have.deep.members(
						[{id: "rooms1", kind: InsightDatasetKind.Rooms, numRows: 1},
							{id: "rooms2", kind: InsightDatasetKind.Rooms, numRows: 1}]);
					expect(result).to.have.lengthOf(2);
					await facade.removeDataset("rooms2");
					const newResult = await facade.listDatasets();
					expect(newResult).to.have.deep.members(
						[{id: "rooms1", kind: InsightDatasetKind.Rooms, numRows: 1}]);
					expect(newResult).to.have.lengthOf(1);
					await facade.removeDataset("rooms1");
					const anotherResult = await facade.listDatasets();
					return expect(anotherResult).to.have.lengthOf(0);
				} catch (err) {
					return expect.fail("should NOT have failed listing the multiple datasets" + err);
				}
			});

			it("should successfully list multiple datasets - rooms and section kind", async function () {
				try {
					await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
					await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
					const result = await facade.listDatasets();
					expect(result).to.have.deep.members(
						[{id: "sections", kind: InsightDatasetKind.Sections, numRows: 104},
							{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 1}]);
					expect(result).to.have.lengthOf(2);
					await facade.removeDataset("sections");
					const newResult = await facade.listDatasets();
					expect(newResult).to.have.deep.members(
						[{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 1}]);
					expect(newResult).to.have.lengthOf(1);
					await facade.removeDataset("rooms");
					const anotherResult = await facade.listDatasets();
					return expect(anotherResult).to.have.lengthOf(0);
				} catch (err) {
					return expect.fail("should NOT have failed listing the multiple datasets" + err);
				}
			});

			it("should list full dataset", async function () {
				try {
					await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
					const result = await facade.listDatasets();
					return expect(result).to.deep.members([
						{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364}
					]);
				} catch (err) {
					return expect.fail("should not have failed");
				}
 			});
		});

		describe("Load Dataset, Handle Disk and Crashes", function () {

			describe("Kind: Section", function () {
				beforeEach(function () {
					facade = new InsightFacade();
					clearDisk();
				});

				it("should add small dataset and save it to disk", async function () {
					try {
						const result = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(result).to.deep.members(["sections"]);
						// check if ./data folder contains the file "sections.json"
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileExists).to.be.true;
					} catch (err) {
						return expect.fail("should NOT have failed to save valid dataset to disk" + err);
					}
				});

				it("should add dataset and not remove invalid dataset", async function () {
					try {
						const add = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(add).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;
						await facade.removeDataset("");
						return expect.fail("should NOT have failed to remove an invalid dataset");
					} catch (err) {
						expect(err).to.be.instanceOf(InsightError);
					}
					try {
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileStillExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileStillExists).to.be.true;
					} catch (err) {
						return expect.fail("should NOT have failed to not find file that should still be on disk");
					}
				});

				it("should add and remove dataset, as well as it from the disk", async function () {
					try {
						const add = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(add).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;
						const remove = await facade.removeDataset("sections");
						expect(remove).to.be.equals("sections");
						const fileNoLongerExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileNoLongerExists).to.be.false;
					} catch (err) {
						return expect.fail("should NOT have failed to remove valid dataset to disk" + err);
					}
				});

				it("should not be able to add invalid dataset on a new instance", async function () {
					try {
						const add = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(add).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						await newInstance.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect.fail("should have failed to add the same dataset id to a new instance");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should be able to add datasets on a new instance", async function () {
					try {
						const add1 = await facade.addDataset("sections1", sectionsSmall, InsightDatasetKind.Sections);
						expect(add1).to.deep.members(["sections1"]);
						const filePath1 = path.join(__dirname, "../../data", "sections1-Sections.json");
						const fileExists1 = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const add2 = await newInstance.addDataset("sections2", sectionsSmall,
							InsightDatasetKind.Sections);
						expect(add2).to.deep.members(["sections1", "sections2"]);
						const filePath2 = path.join(__dirname, "../../data", "sections2-Sections.json");
						const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
						expect(fileExists2).to.be.true;
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to remove datasets on a new instance", async function () {
					try {
						const add = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(add).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const result = await newInstance.removeDataset("sections");
						return expect(result).to.equals("sections");
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to list datasets on a new instance", async function () {
					try {
						const add = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
						expect(add).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const result = await newInstance.listDatasets();
						expect(result).to.deep.equals([{
							id: "sections",
							kind: InsightDatasetKind.Sections,
							numRows: 104
						}]);
						return expect(result).to.have.lengthOf(1);
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to add/remove/list datasets on a new instance", async function () {
					try {
						// first add on facade instance
						const add1 = await facade.addDataset("sections1", sectionsSmall, InsightDatasetKind.Sections);
						expect(add1).to.deep.members(["sections1"]);
						const filePath1 = path.join(__dirname, "../../data", "sections1-Sections.json");
						const fileExists1 = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1).to.be.true;

						// second add on facade instance
						const add2 = await facade.addDataset("sections2", sectionsSmall, InsightDatasetKind.Sections);
						expect(add2).to.deep.members(["sections1", "sections2"]);
						const filePath2 = path.join(__dirname, "../../data", "sections2-Sections.json");
						const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
						expect(fileExists2).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const listFacade = await newInstance.listDatasets();
						expect(listFacade).to.have.deep.members([{
							id: "sections2",
							kind: InsightDatasetKind.Sections,
							numRows: 104
						}, {
							id: "sections1",
							kind: InsightDatasetKind.Sections,
							numRows: 104
						}]);
						expect(listFacade).to.have.lengthOf(2);
						const remove1 = await newInstance.removeDataset("sections1");
						expect(remove1).to.deep.equals("sections1");
						const fileExists1Removed = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1Removed).to.be.false;
						const add3 = await newInstance.addDataset("sections3", sectionsSmall,
							InsightDatasetKind.Sections);
						expect(add3).to.deep.equals(["sections2", "sections3"]);
						const filePath3 = path.join(__dirname, "../../data", "sections3-Sections.json");
						const fileExists3 = await fs.access(filePath3).then(() => true).catch(() => false);
						expect(fileExists3).to.be.true;
						const listNew = await newInstance.listDatasets();
						expect(listNew).to.have.deep.members([{
							id: "sections2",
							kind: InsightDatasetKind.Sections,
							numRows: 104
						}, {
							id: "sections3",
							kind: InsightDatasetKind.Sections,
							numRows: 104
						}]);
						return expect(listNew).to.have.lengthOf(2);
					} catch (err) {
						return expect.fail("should NOT failed to add/remove/list datasets on a new instance" + err);
					}
				});

				it("should be able to query on a new instance and return the same result", async () => {
					try {
						const ds = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
						expect(ds).to.deep.members(["sections"]);
						const filePath = path.join(__dirname, "../../data", "sections-Sections.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;
						const query = {
							WHERE: {
								AND: [
									{
										IS: {
											sections_dept: "cpsc"
										}
									},
									{
										GT: {
											sections_avg: 93
										}
									}
								]
							},
							OPTIONS: {
								COLUMNS: [
									"sections_id",
									"sections_avg"
								]
							}
						};
						const expected: InsightResult[] = [
							{sections_id: "449", sections_avg: 93.38},
							{sections_id: "449", sections_avg: 93.38},
							{sections_id: "449", sections_avg: 93.5},
							{sections_id: "449", sections_avg: 93.5},
							{sections_id: "501", sections_avg: 94},
							{sections_id: "501", sections_avg: 94},
							{sections_id: "503", sections_avg: 94.5},
							{sections_id: "503", sections_avg: 94.5},
							{sections_id: "589", sections_avg: 95},
							{sections_id: "589", sections_avg: 95}
						];
						let result = await facade.performQuery(query);
						expect(result).to.deep.equals(expected);

						// crash!!
						const newInstance = new InsightFacade();
						let newResult = await newInstance.performQuery(query);
						return expect(newResult).to.deep.equals(result);
					} catch (err) {
						return expect.fail("should NOT fail to query on a new instance: " + err);
					}
				});
			});

			describe("Kind: Room", function () {
				beforeEach(function () {
					facade = new InsightFacade();
					clearDisk();
				});

				afterEach(function () {
					clearDisk();
				});

				it("should add small dataset and save it to disk", async function () {
					try {
						const result = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(result).to.deep.members(["rooms"]);
						// check if ./data folder contains the file "sections.json"
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileExists).to.be.true;
					} catch (err) {
						return expect.fail("should NOT have failed to save valid dataset to disk" + err);
					}
				});

				it("should add dataset and not remove invalid dataset", async function () {
					try {
						const add = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(add).to.deep.members(["rooms"]);
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;
						await facade.removeDataset("");
						return expect.fail("should NOT have failed to remove an invalid dataset");
					} catch (err) {
						expect(err).to.be.instanceOf(InsightError);
					}
					try {
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileStillExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileStillExists).to.be.true;
					} catch (err) {
						return expect.fail("should NOT have failed to not find file that should still be on disk");
					}
				});

				it("should add and remove dataset, as well as it from the disk", async function () {
					try {
						const add = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(add).to.deep.members(["rooms"]);
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;
						const remove = await facade.removeDataset("rooms");
						expect(remove).to.be.equals("rooms");
						const fileNoLongerExists = await fs.access(filePath).then(() => true).catch(() => false);
						return expect(fileNoLongerExists).to.be.false;
					} catch (err) {
						return expect.fail("should NOT have failed to remove valid dataset to disk" + err);
					}
				});

				it("should not be able to add invalid dataset on a new instance", async function () {
					try {
						const add = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(add).to.deep.members(["rooms"]);
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const failed = await newInstance.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						return expect.fail("should have failed to add the same dataset id to a new instance");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should be able to remove datasets on a new instance", async function () {
					try {
						const add = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(add).to.deep.members(["rooms"]);
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const result = await newInstance.removeDataset("rooms");
						return expect(result).to.equals("rooms");
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to add datasets on a new instance", async function () {
					clearDisk();
					try {
						const add1 = await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
						expect(add1).to.deep.members(["rooms1"]);
						const filePath1 = path.join(__dirname, "../../data", "rooms1-Rooms.json");
						const fileExists1 = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const add2 = await newInstance.addDataset("rooms2", roomsOne,
							InsightDatasetKind.Rooms);
						expect(add2).to.deep.members(["rooms1", "rooms2"]);
						const filePath2 = path.join(__dirname, "../../data", "rooms2-Rooms.json");
						const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
						return expect(fileExists2).to.be.true;
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to list datasets on a new instance", async function () {
					try {
						const add = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect(add).to.deep.members(["rooms"]);
						const filePath = path.join(__dirname, "../../data", "rooms-Rooms.json");
						const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
						expect(fileExists).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const result = await newInstance.listDatasets();
						expect(result).to.deep.equals([{
							id: "rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}]);
						return expect(result).to.have.lengthOf(1);
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
					}
				});

				it("should be able to add/remove/list datasets on a new instance", async function () {
					try {
						// first add on facade instance
						const add1 = await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
						expect(add1).to.deep.members(["rooms1"]);
						const filePath1 = path.join(__dirname, "../../data", "rooms1-Rooms.json");
						const fileExists1 = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1).to.be.true;

						// second add on facade instance
						const add2 = await facade.addDataset("rooms2", roomsOne, InsightDatasetKind.Rooms);
						expect(add2).to.deep.members(["rooms1", "rooms2"]);
						const filePath2 = path.join(__dirname, "../../data", "rooms2-Rooms.json");
						const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
						expect(fileExists2).to.be.true;

						// crash!!
						const newInstance = new InsightFacade();
						const listFacade = await newInstance.listDatasets();
						const expected = [{
							id: "rooms1",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}, {
							id: "rooms2",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}];
						expect(listFacade).to.have.deep.members(expected);
						expect(listFacade).to.have.lengthOf(2);
						const remove1 = await newInstance.removeDataset("rooms1");
						expect(remove1).to.deep.equals("rooms1");
						const fileExists1Removed = await fs.access(filePath1).then(() => true).catch(() => false);
						expect(fileExists1Removed).to.be.false;
						const add3 = await newInstance.addDataset("rooms3", roomsOne,
							InsightDatasetKind.Rooms);
						expect(add3).to.deep.equals(["rooms2", "rooms3"]);
						const filePath3 = path.join(__dirname, "../../data", "rooms3-Rooms.json");
						const fileExists3 = await fs.access(filePath3).then(() => true).catch(() => false);
						expect(fileExists3).to.be.true;
						const listNew = await newInstance.listDatasets();
						expect(listNew).to.have.deep.members([{
							id: "rooms2",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}, {
							id: "rooms3",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}]);
						return expect(listNew).to.have.lengthOf(2);
					} catch (err) {
						return expect.fail("should NOT failed to add/remove/list datasets on a new instance" + err);
					}
				});
			});

			it("should add/remove/list with room and section datasets on a new instance", async function () {
				try {
					// add section dataset on facade instance
					const addSection = await facade.addDataset("sections", sectionsSmall, InsightDatasetKind.Sections);
					expect(addSection).to.deep.members(["sections"]);
					const filePath1 = path.join(__dirname, "../../data", "sections-Sections.json");
					const fileExists1 = await fs.access(filePath1).then(() => true).catch(() => false);
					expect(fileExists1).to.be.true;

					// add room dataset on facade instance
					const addRooms = await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
					expect(addRooms).to.deep.members(["sections", "rooms"]);
					const filePath2 = path.join(__dirname, "../../data", "rooms-Rooms.json");
					const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
					expect(fileExists2).to.be.true;

					// crash!!
					const newInstance = new InsightFacade();
					const listFacade = await newInstance.listDatasets();
					expect(listFacade).to.have.deep.members([{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 104
					}, {
						id: "rooms",
						kind: InsightDatasetKind.Rooms,
						numRows: 1
					}]);
					expect(listFacade).to.have.lengthOf(2);
					const removeRooms = await newInstance.removeDataset("rooms");
					expect(removeRooms).to.deep.equals("rooms");
					const fileExists1Removed = await fs.access(filePath2).then(() => true).catch(() => false);
					expect(fileExists1Removed).to.be.false;
					const addRooms2 = await newInstance.addDataset("rooms2", roomsOne,
						InsightDatasetKind.Rooms);
					expect(addRooms2).to.deep.equals(["sections", "rooms2"]);
					const filePath3 = path.join(__dirname, "../../data", "rooms2-Rooms.json");
					const fileExists3 = await fs.access(filePath3).then(() => true).catch(() => false);
					expect(fileExists3).to.be.true;
					const listNew = await newInstance.listDatasets();
					expect(listNew).to.have.deep.members([{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 104
					}, {
						id: "rooms2",
						kind: InsightDatasetKind.Rooms,
						numRows: 1
					}]);
					return expect(listNew).to.have.lengthOf(2);
				} catch (err) {
					return expect.fail("should NOT failed to add/remove/list datasets on a new instance" + err);
				}
			});
		});
	});

	describe("PerformQuery", function () { // TODO: remove only
		/*
		 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
		 * You should not need to modify it; instead, add additional files to the queries directory.
		 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
		 */
		describe("PerformQuery Folder Test", () => {
			before(function () {

				facade = new InsightFacade();
				clearDisk();
				// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
				// Will *fail* if there is a problem reading ANY dataset.
				const loadDatasetPromises = [
					facade.addDataset("sections", sections, InsightDatasetKind.Sections),
					facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				];

				return Promise.all(loadDatasetPromises);
			});

			after(function () {
				clearDisk();
			});

			type PQErrorKind = "ResultTooLargeError" | "InsightError";

			folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
				"Dynamic InsightFacade PerformQuery tests",
				(input) => facade.performQuery(input),
				"./test/resources/queries",
				{
					assertOnResult: (actual, expected) => {
						expect(actual).to.deep.equal(expected);
					},
					errorValidator: (error): error is PQErrorKind =>
						error === "ResultTooLargeError" || error === "InsightError",
					assertOnError: (actual, expected) => {
						if (expected === "InsightError") {
							expect(actual).to.be.instanceOf(InsightError);
						} else {
							expect(actual).to.be.instanceOf(ResultTooLargeError);
						}
					},
				}
			);
		});

		describe("PerformQuery Additional Tests", function () {
			beforeEach( function () {
				facade = new InsightFacade();
				clearDisk();
			});

			it("C1 user story 1 - query many times on many different datasets", async function () {
				try {
					const first = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
					// perform queries on section
					const query1 = await facade.performQuery({
						WHERE: {
							AND: [
								{
									IS: {
										sections_dept: "cpsc"
									}
								},
								{
									GT: {
										sections_avg: 93
									}
								}
							]
						},
						OPTIONS: {
							COLUMNS: [
								"sections_id",
								"sections_avg"
							]
						}
					});
					const query1expected = [
						{sections_id: "449", sections_avg: 93.38},
						{sections_id: "449", sections_avg: 93.38},
						{sections_id: "449", sections_avg: 93.5},
						{sections_id: "449", sections_avg: 93.5},
						{sections_id: "501", sections_avg: 94},
						{sections_id: "501", sections_avg: 94},
						{sections_id: "503", sections_avg: 94.5},
						{sections_id: "503", sections_avg: 94.5},
						{sections_id: "589", sections_avg: 95},
						{sections_id: "589", sections_avg: 95}
					];
					expect(query1).to.deep.equals(query1expected);

					const query2 = await facade.performQuery({
						WHERE: {
							GT: {
								sections_audit: 19
							}
						},
						OPTIONS: {
							COLUMNS: [
								"sections_dept",
								"sections_audit"
							]
						}
					});
					const query2expected = [
						{sections_dept: "cpsc", sections_audit: 21},
						{sections_dept: "rhsc", sections_audit: 23},
						{sections_dept: "rhsc", sections_audit: 21},
						{sections_dept: "rhsc", sections_audit: 20}
					];
					expect(query2).to.deep.equals(query2expected);

					const second = await facade.addDataset("sectionsIncomplete",
						getContentFromArchives("pairValidAndInvalidSection.zip"), InsightDatasetKind.Sections);
					// perform queries on section2
					const query3 = await facade.performQuery({
						WHERE: {
							IS: {
								sectionsIncomplete_id: "449"
							}
						},
						OPTIONS: {
							COLUMNS: [
								"sectionsIncomplete_dept",
								"sectionsIncomplete_audit"
							]
						}
					});
					const query3expected = [{sectionsIncomplete_dept: "cnrs", sectionsIncomplete_audit: 0}];
					expect(query3).to.deep.equals(query3expected);

					const removeFirst = await facade.removeDataset("sections");
					return expect(removeFirst).to.deep.equals("sections");
				} catch (err) {
					return expect.fail("Should not have failed to query multiple times across different datasets");
				}
			});

			it("should reject if query references multiple datasets", async function () {
				const first = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				let sectionsS = getContentFromArchives("pairSmall.zip");
				const result = facade.addDataset("sections2", sectionsS, InsightDatasetKind.Sections);

				return expect(result).to.eventually.have.members(["sections", "sections2"])
					.then(() => {
						const query = facade.performQuery({
							WHERE: {
								AND: [
									{
										GT: {
											sections_avg: 60
										}
									},
									{
										GT: {
											sections2_avg: 60
										}
									}
								]
							},
							OPTIONS: {
								COLUMNS: [
									"sections_avg",
									"sections2_avg"
								]
							}
						});

						return expect(query).to.eventually.be.rejectedWith(InsightError);
					});
			});

		});
	});

	describe("C2 User Stories", function () {
		beforeEach(function () {
			facade = new InsightFacade();
			clearDisk();
		});

		it("1. should handle different dataset structures", async function () {
			// I add the current year's rooms dataset. This should exactly follow the structure of the dataset I gave you.
			// I add a rooms dataset from 2015. The building HTMLs from this dataset look a bit different.
			// I add a rooms dataset from 2012. Apparently someone messed up and this dataset is missing an entire building file!
			// I add a rooms dataset from 2010. It looks like we had fewer buildings back then.
			// But when I got to Step 3, I should still be able to add and view the rest of the rooms.
			try {
				const addCurrent = await facade.addDataset("currentRooms", rooms, InsightDatasetKind.Rooms);
				expect(addCurrent).to.deep.equals(["currentRooms"]);

				const add2015 = await facade.addDataset("2015", getContentFromArchives(
					"campusDifferentBuildingFileStructure.zip"), InsightDatasetKind.Rooms);
				expect(add2015).to.deep.equals(["currentRooms", "2015"]);
				const listCurrent2015 = await facade.listDatasets();
				expect(listCurrent2015).to.deep.equals([
					{id: "currentRooms", kind: InsightDatasetKind.Rooms, numRows: 364},
					{id: "2015", kind: InsightDatasetKind.Rooms, numRows: 9}
				]);

				const add2012 = await facade.addDataset("2012", getContentFromArchives(
					"campusMissingALRDBuildingFile.zip"), InsightDatasetKind.Rooms);
				expect(add2012).to.deep.equals(["currentRooms", "2015", "2012"]);
				const listCurrent2012 = await facade.listDatasets();
				expect(listCurrent2012).to.deep.equals([
					{id: "currentRooms", kind: InsightDatasetKind.Rooms, numRows: 364},
					{id: "2015", kind: InsightDatasetKind.Rooms, numRows: 9},
					{id: "2012", kind: InsightDatasetKind.Rooms, numRows: 359}
				]);

				const add2010 = await facade.addDataset("2010", roomsOne, InsightDatasetKind.Rooms);
				expect(add2010).to.deep.equals(["currentRooms", "2015", "2012", "2010"]);
				const listCurrent2010 = await facade.listDatasets();
				return expect(listCurrent2010).to.deep.equals([
					{id: "currentRooms", kind: InsightDatasetKind.Rooms, numRows: 364},
					{id: "2015", kind: InsightDatasetKind.Rooms, numRows: 9},
					{id: "2012", kind: InsightDatasetKind.Rooms, numRows: 359},
					{id: "2010", kind: InsightDatasetKind.Rooms, numRows: 1}
				]);
			} catch (err) {
				return expect.fail("should not have failed to handle different dataset structures" + err);
			}
		}).timeout(10000);

		it("2. should have dataset assurance", async function () {
			// I add queryable sections and rooms datasets
			// I list all the datasets and ensure the correct number of rooms/sections were added.
			// But when I got to Step 2, I didn't get the response that I expected.
			try {
				const addSection = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				expect(addSection).to.deep.equals(["sections"]);

				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				expect(addRoom).to.deep.equals(["sections", "rooms"]);
				const list = await facade.listDatasets();
				return expect(list).to.deep.equals([
					{id: "sections", kind: InsightDatasetKind.Sections, numRows: 64612},
					{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364}
				]);
			} catch (err) {
				return expect.fail("should not have failed to have dataset assurance" + err);
			}
		}).timeout(10000);

		it("3. should be able to carry out all the standard operations of an expected lifecycle", async function () {
			// I add the original rooms dataset I sent you.
			// I also add the sections dataset I sent you.
			// I list the rooms dataset and assert that the number of rows is correct.
			// I invoke performQuery on the rooms dataset complete with aggregations.
			// I invoke performQuery on the sections dataset -- again with aggregations.
			// I remove both the datasets.
			// But when I got to Step 3, I didn't get the response that I expected.
			try {
				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				expect(addRoom).to.deep.equals(["rooms"]);

				const addSection = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				expect(addSection).to.deep.equals(["rooms", "sections"]);

				const list = await facade.listDatasets();
				expect(list).to.deep.equals([
					{id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364},
					{id: "sections", kind: InsightDatasetKind.Sections, numRows: 64612}
				]);

				const roomsQuery = await facade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"rooms_shortname",
							"roomsInBuildings"
						]
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_shortname"
						],
						APPLY: [
							{
								roomsInBuildings: {
									COUNT: "rooms_name"
								}
							}
						]
					}
				});
				expect(roomsQuery).to.deep.equals([
					{
						rooms_shortname: "ALRD",
						roomsInBuildings: 5
					},
					{
						rooms_shortname: "ANSO",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "AERL",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "AUDX",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "BIOL",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "BRKX",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "BUCH",
						roomsInBuildings: 61
					},
					{
						rooms_shortname: "CIRS",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "CHBE",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "CHEM",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "CEME",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "EOSM",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "ESB",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "FNH",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "FSC",
						roomsInBuildings: 10
					},
					{
						rooms_shortname: "FORW",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "LASR",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "FRDM",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "GEOG",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "HEBB",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "HENN",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "ANGU",
						roomsInBuildings: 28
					},
					{
						rooms_shortname: "DMP",
						roomsInBuildings: 5
					},
					{
						rooms_shortname: "IONA",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "IBLC",
						roomsInBuildings: 18
					},
					{
						rooms_shortname: "SOWK",
						roomsInBuildings: 7
					},
					{
						rooms_shortname: "LSK",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "LSC",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "MCLD",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "MCML",
						roomsInBuildings: 19
					},
					{
						rooms_shortname: "MATH",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "MATX",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "SCRF",
						roomsInBuildings: 22
					},
					{
						rooms_shortname: "ORCH",
						roomsInBuildings: 21
					},
					{
						rooms_shortname: "PHRM",
						roomsInBuildings: 11
					},
					{
						rooms_shortname: "PCOH",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "OSBO",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "SPPH",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "SRC",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "UCLL",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "MGYM",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "WESB",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "SWNG",
						roomsInBuildings: 22
					},
					{
						rooms_shortname: "WOOD",
						roomsInBuildings: 16
					}
				]);

				const sectionsQuery = await facade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"sections_dept",
							"coursesInDept"
						]
					},
					TRANSFORMATIONS: {
						GROUP: [
							"sections_dept"
						],
						APPLY: [
							{
								coursesInDept: {
									COUNT: "sections_id"
								}
							}
						]
					}
				});
				expect(sectionsQuery).to.deep.equals([
					{
						sections_dept: "aanb",
						coursesInDept: 2
					},
					{
						sections_dept: "adhe",
						coursesInDept: 5
					},
					{
						sections_dept: "anat",
						coursesInDept: 4
					},
					{
						sections_dept: "anth",
						coursesInDept: 26
					},
					{
						sections_dept: "apbi",
						coursesInDept: 40
					},
					{
						sections_dept: "appp",
						coursesInDept: 4
					},
					{
						sections_dept: "apsc",
						coursesInDept: 18
					},
					{
						sections_dept: "arbc",
						coursesInDept: 4
					},
					{
						sections_dept: "arch",
						coursesInDept: 29
					},
					{
						sections_dept: "arcl",
						coursesInDept: 13
					},
					{
						sections_dept: "arst",
						coursesInDept: 19
					},
					{
						sections_dept: "arth",
						coursesInDept: 32
					},
					{
						sections_dept: "asia",
						coursesInDept: 57
					},
					{
						sections_dept: "asic",
						coursesInDept: 2
					},
					{
						sections_dept: "astr",
						coursesInDept: 16
					},
					{
						sections_dept: "astu",
						coursesInDept: 5
					},
					{
						sections_dept: "atsc",
						coursesInDept: 8
					},
					{
						sections_dept: "audi",
						coursesInDept: 34
					},
					{
						sections_dept: "ba",
						coursesInDept: 10
					},
					{
						sections_dept: "baac",
						coursesInDept: 6
					},
					{
						sections_dept: "babs",
						coursesInDept: 3
					},
					{
						sections_dept: "baen",
						coursesInDept: 6
					},
					{
						sections_dept: "bafi",
						coursesInDept: 11
					},
					{
						sections_dept: "bahr",
						coursesInDept: 5
					},
					{
						sections_dept: "bait",
						coursesInDept: 5
					},
					{
						sections_dept: "bala",
						coursesInDept: 1
					},
					{
						sections_dept: "bama",
						coursesInDept: 9
					},
					{
						sections_dept: "bams",
						coursesInDept: 12
					},
					{
						sections_dept: "bapa",
						coursesInDept: 2
					},
					{
						sections_dept: "basc",
						coursesInDept: 4
					},
					{
						sections_dept: "basm",
						coursesInDept: 6
					},
					{
						sections_dept: "baul",
						coursesInDept: 1
					},
					{
						sections_dept: "bioc",
						coursesInDept: 19
					},
					{
						sections_dept: "biof",
						coursesInDept: 3
					},
					{
						sections_dept: "biol",
						coursesInDept: 91
					},
					{
						sections_dept: "bmeg",
						coursesInDept: 9
					},
					{
						sections_dept: "bota",
						coursesInDept: 4
					},
					{
						sections_dept: "busi",
						coursesInDept: 40
					},
					{
						sections_dept: "caps",
						coursesInDept: 12
					},
					{
						sections_dept: "ccst",
						coursesInDept: 4
					},
					{
						sections_dept: "ceen",
						coursesInDept: 4
					},
					{
						sections_dept: "cell",
						coursesInDept: 12
					},
					{
						sections_dept: "cens",
						coursesInDept: 4
					},
					{
						sections_dept: "chbe",
						coursesInDept: 55
					},
					{
						sections_dept: "chem",
						coursesInDept: 63
					},
					{
						sections_dept: "chil",
						coursesInDept: 1
					},
					{
						sections_dept: "chin",
						coursesInDept: 43
					},
					{
						sections_dept: "cics",
						coursesInDept: 2
					},
					{
						sections_dept: "civl",
						coursesInDept: 84
					},
					{
						sections_dept: "clch",
						coursesInDept: 3
					},
					{
						sections_dept: "clst",
						coursesInDept: 25
					},
					{
						sections_dept: "cnps",
						coursesInDept: 19
					},
					{
						sections_dept: "cnrs",
						coursesInDept: 4
					},
					{
						sections_dept: "cnto",
						coursesInDept: 2
					},
					{
						sections_dept: "coec",
						coursesInDept: 5
					},
					{
						sections_dept: "cogs",
						coursesInDept: 5
					},
					{
						sections_dept: "cohr",
						coursesInDept: 12
					},
					{
						sections_dept: "comm",
						coursesInDept: 99
					},
					{
						sections_dept: "cons",
						coursesInDept: 15
					},
					{
						sections_dept: "cpen",
						coursesInDept: 18
					},
					{
						sections_dept: "cpsc",
						coursesInDept: 53
					},
					{
						sections_dept: "crwr",
						coursesInDept: 12
					},
					{
						sections_dept: "dani",
						coursesInDept: 4
					},
					{
						sections_dept: "dent",
						coursesInDept: 46
					},
					{
						sections_dept: "dhyg",
						coursesInDept: 18
					},
					{
						sections_dept: "eced",
						coursesInDept: 10
					},
					{
						sections_dept: "econ",
						coursesInDept: 93
					},
					{
						sections_dept: "edcp",
						coursesInDept: 26
					},
					{
						sections_dept: "edst",
						coursesInDept: 25
					},
					{
						sections_dept: "educ",
						coursesInDept: 11
					},
					{
						sections_dept: "eece",
						coursesInDept: 35
					},
					{
						sections_dept: "elec",
						coursesInDept: 54
					},
					{
						sections_dept: "ends",
						coursesInDept: 9
					},
					{
						sections_dept: "engl",
						coursesInDept: 32
					},
					{
						sections_dept: "enph",
						coursesInDept: 5
					},
					{
						sections_dept: "envr",
						coursesInDept: 7
					},
					{
						sections_dept: "eosc",
						coursesInDept: 89
					},
					{
						sections_dept: "epse",
						coursesInDept: 58
					},
					{
						sections_dept: "etec",
						coursesInDept: 12
					},
					{
						sections_dept: "fhis",
						coursesInDept: 1
					},
					{
						sections_dept: "fipr",
						coursesInDept: 14
					},
					{
						sections_dept: "fish",
						coursesInDept: 5
					},
					{
						sections_dept: "fist",
						coursesInDept: 12
					},
					{
						sections_dept: "fmst",
						coursesInDept: 7
					},
					{
						sections_dept: "fnel",
						coursesInDept: 9
					},
					{
						sections_dept: "fnh",
						coursesInDept: 38
					},
					{
						sections_dept: "fnis",
						coursesInDept: 8
					},
					{
						sections_dept: "food",
						coursesInDept: 11
					},
					{
						sections_dept: "fopr",
						coursesInDept: 7
					},
					{
						sections_dept: "fre",
						coursesInDept: 18
					},
					{
						sections_dept: "fren",
						coursesInDept: 28
					},
					{
						sections_dept: "frst",
						coursesInDept: 72
					},
					{
						sections_dept: "gbpr",
						coursesInDept: 2
					},
					{
						sections_dept: "geob",
						coursesInDept: 23
					},
					{
						sections_dept: "geog",
						coursesInDept: 47
					},
					{
						sections_dept: "germ",
						coursesInDept: 23
					},
					{
						sections_dept: "gpp",
						coursesInDept: 10
					},
					{
						sections_dept: "grek",
						coursesInDept: 6
					},
					{
						sections_dept: "grsj",
						coursesInDept: 23
					},
					{
						sections_dept: "gsat",
						coursesInDept: 3
					},
					{
						sections_dept: "hebr",
						coursesInDept: 4
					},
					{
						sections_dept: "hgse",
						coursesInDept: 10
					},
					{
						sections_dept: "hinu",
						coursesInDept: 1
					},
					{
						sections_dept: "hist",
						coursesInDept: 69
					},
					{
						sections_dept: "hunu",
						coursesInDept: 2
					},
					{
						sections_dept: "iar",
						coursesInDept: 1
					},
					{
						sections_dept: "igen",
						coursesInDept: 8
					},
					{
						sections_dept: "info",
						coursesInDept: 1
					},
					{
						sections_dept: "isci",
						coursesInDept: 6
					},
					{
						sections_dept: "ital",
						coursesInDept: 15
					},
					{
						sections_dept: "itst",
						coursesInDept: 9
					},
					{
						sections_dept: "iwme",
						coursesInDept: 1
					},
					{
						sections_dept: "japn",
						coursesInDept: 24
					},
					{
						sections_dept: "jrnl",
						coursesInDept: 3
					},
					{
						sections_dept: "kin",
						coursesInDept: 53
					},
					{
						sections_dept: "korn",
						coursesInDept: 5
					},
					{
						sections_dept: "lais",
						coursesInDept: 1
					},
					{
						sections_dept: "larc",
						coursesInDept: 19
					},
					{
						sections_dept: "laso",
						coursesInDept: 1
					},
					{
						sections_dept: "last",
						coursesInDept: 2
					},
					{
						sections_dept: "latn",
						coursesInDept: 6
					},
					{
						sections_dept: "law",
						coursesInDept: 83
					},
					{
						sections_dept: "lfs",
						coursesInDept: 9
					},
					{
						sections_dept: "libe",
						coursesInDept: 4
					},
					{
						sections_dept: "libr",
						coursesInDept: 34
					},
					{
						sections_dept: "ling",
						coursesInDept: 30
					},
					{
						sections_dept: "lled",
						coursesInDept: 27
					},
					{
						sections_dept: "math",
						coursesInDept: 94
					},
					{
						sections_dept: "mdvl",
						coursesInDept: 2
					},
					{
						sections_dept: "mech",
						coursesInDept: 85
					},
					{
						sections_dept: "medg",
						coursesInDept: 13
					},
					{
						sections_dept: "medi",
						coursesInDept: 8
					},
					{
						sections_dept: "micb",
						coursesInDept: 27
					},
					{
						sections_dept: "midw",
						coursesInDept: 14
					},
					{
						sections_dept: "mine",
						coursesInDept: 41
					},
					{
						sections_dept: "mrne",
						coursesInDept: 4
					},
					{
						sections_dept: "mtrl",
						coursesInDept: 48
					},
					{
						sections_dept: "musc",
						coursesInDept: 52
					},
					{
						sections_dept: "name",
						coursesInDept: 7
					},
					{
						sections_dept: "nest",
						coursesInDept: 7
					},
					{
						sections_dept: "nrsc",
						coursesInDept: 3
					},
					{
						sections_dept: "nurs",
						coursesInDept: 46
					},
					{
						sections_dept: "obst",
						coursesInDept: 7
					},
					{
						sections_dept: "onco",
						coursesInDept: 1
					},
					{
						sections_dept: "path",
						coursesInDept: 27
					},
					{
						sections_dept: "pcth",
						coursesInDept: 12
					},
					{
						sections_dept: "pers",
						coursesInDept: 6
					},
					{
						sections_dept: "phar",
						coursesInDept: 51
					},
					{
						sections_dept: "phil",
						coursesInDept: 17
					},
					{
						sections_dept: "phrm",
						coursesInDept: 5
					},
					{
						sections_dept: "phth",
						coursesInDept: 16
					},
					{
						sections_dept: "phys",
						coursesInDept: 68
					},
					{
						sections_dept: "plan",
						coursesInDept: 16
					},
					{
						sections_dept: "poli",
						coursesInDept: 22
					},
					{
						sections_dept: "pols",
						coursesInDept: 2
					},
					{
						sections_dept: "port",
						coursesInDept: 8
					},
					{
						sections_dept: "psyc",
						coursesInDept: 52
					},
					{
						sections_dept: "punj",
						coursesInDept: 5
					},
					{
						sections_dept: "relg",
						coursesInDept: 15
					},
					{
						sections_dept: "rgla",
						coursesInDept: 1
					},
					{
						sections_dept: "rhsc",
						coursesInDept: 10
					},
					{
						sections_dept: "rmes",
						coursesInDept: 13
					},
					{
						sections_dept: "rmst",
						coursesInDept: 2
					},
					{
						sections_dept: "rsot",
						coursesInDept: 11
					},
					{
						sections_dept: "russ",
						coursesInDept: 9
					},
					{
						sections_dept: "sans",
						coursesInDept: 3
					},
					{
						sections_dept: "scan",
						coursesInDept: 4
					},
					{
						sections_dept: "scie",
						coursesInDept: 2
					},
					{
						sections_dept: "soci",
						coursesInDept: 19
					},
					{
						sections_dept: "soil",
						coursesInDept: 9
					},
					{
						sections_dept: "sowk",
						coursesInDept: 33
					},
					{
						sections_dept: "span",
						coursesInDept: 21
					},
					{
						sections_dept: "spha",
						coursesInDept: 20
					},
					{
						sections_dept: "spph",
						coursesInDept: 51
					},
					{
						sections_dept: "stat",
						coursesInDept: 21
					},
					{
						sections_dept: "sts",
						coursesInDept: 3
					},
					{
						sections_dept: "surg",
						coursesInDept: 4
					},
					{
						sections_dept: "swed",
						coursesInDept: 4
					},
					{
						sections_dept: "test",
						coursesInDept: 1
					},
					{
						sections_dept: "thtr",
						coursesInDept: 43
					},
					{
						sections_dept: "udes",
						coursesInDept: 4
					},
					{
						sections_dept: "ufor",
						coursesInDept: 3
					},
					{
						sections_dept: "urst",
						coursesInDept: 2
					},
					{
						sections_dept: "ursy",
						coursesInDept: 2
					},
					{
						sections_dept: "vant",
						coursesInDept: 2
					},
					{
						sections_dept: "visa",
						coursesInDept: 28
					},
					{
						sections_dept: "wood",
						coursesInDept: 30
					},
					{
						sections_dept: "wrds",
						coursesInDept: 1
					},
					{
						sections_dept: "zool",
						coursesInDept: 2
					}
				]);

				const removeRoom = await facade.removeDataset("rooms");
				expect(removeRoom).to.deep.equals("rooms");

				const removeSection = await facade.removeDataset("sections");
				return expect(removeSection).to.deep.equals("sections");
			} catch (err) {
				return expect.fail("should not have failed to carry out expected lifestyle" + err);
			}
		}).timeout(10000);

		it("4. should ensure total ordering of data", async function () {
			// I have a rooms added for querying.
			// I query with enough sort fields to ensure a total ordering of result.
			// 	But when I got to Step 2, I didn't get the response that I expected.
			try {
				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				expect(addRoom).to.deep.equals(["rooms"]);

				// probably not correct query for the specified step
				const query = await facade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"rooms_shortname",
							"roomsInBuildings"
						],
						ORDER: {
							dir: "DOWN",
							keys: [
								"roomsInBuildings"
							]
						}
					},
					TRANSFORMATIONS: {
						GROUP: [
							"rooms_shortname"
						],
						APPLY: [
							{
								roomsInBuildings: {
									COUNT: "rooms_name"
								}
							}
						]
					}
				});
				return expect(query).to.deep.equals([
					{
						rooms_shortname: "BUCH",
						roomsInBuildings: 61
					},
					{
						rooms_shortname: "ANGU",
						roomsInBuildings: 28
					},
					{
						rooms_shortname: "SCRF",
						roomsInBuildings: 22
					},
					{
						rooms_shortname: "SWNG",
						roomsInBuildings: 22
					},
					{
						rooms_shortname: "ORCH",
						roomsInBuildings: 21
					},
					{
						rooms_shortname: "MCML",
						roomsInBuildings: 19
					},
					{
						rooms_shortname: "IBLC",
						roomsInBuildings: 18
					},
					{
						rooms_shortname: "WOOD",
						roomsInBuildings: 16
					},
					{
						rooms_shortname: "PHRM",
						roomsInBuildings: 11
					},
					{
						rooms_shortname: "FSC",
						roomsInBuildings: 10
					},
					{
						rooms_shortname: "GEOG",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "MATH",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "PCOH",
						roomsInBuildings: 8
					},
					{
						rooms_shortname: "SOWK",
						roomsInBuildings: 7
					},
					{
						rooms_shortname: "CHEM",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "CEME",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "FNH",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "LASR",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "HENN",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "MCLD",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "SPPH",
						roomsInBuildings: 6
					},
					{
						rooms_shortname: "ALRD",
						roomsInBuildings: 5
					},
					{
						rooms_shortname: "DMP",
						roomsInBuildings: 5
					},
					{
						rooms_shortname: "ANSO",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "BIOL",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "HEBB",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "LSK",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "UCLL",
						roomsInBuildings: 4
					},
					{
						rooms_shortname: "CHBE",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "ESB",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "FORW",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "LSC",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "OSBO",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "SRC",
						roomsInBuildings: 3
					},
					{
						rooms_shortname: "AUDX",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "BRKX",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "IONA",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "MGYM",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "WESB",
						roomsInBuildings: 2
					},
					{
						rooms_shortname: "AERL",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "CIRS",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "EOSM",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "FRDM",
						roomsInBuildings: 1
					},
					{
						rooms_shortname: "MATX",
						roomsInBuildings: 1
					}
				]);
			} catch (err) {
				return expect.fail("should not have failed to ensure total ordering of data" + err);
			}
		}).timeout(10000);

		it("5. should view in browser", async function () {
			// I add rooms dataset for querying.
			// I invoke performQuery in search of rooms' names and links to their websites.
			// But when I got to Step 2, I didn't get the response that I expected.
			try {
				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				expect(addRoom).to.deep.equals(["rooms"]);

				const query = await facade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"rooms_name",
							"rooms_href"
						]
					}
				});
				return expect(query).to.deep.equals([
					{
						rooms_name: "ALRD_105",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-105"
					},
					{
						rooms_name: "ALRD_112",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-112"
					},
					{
						rooms_name: "ALRD_113",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-113"
					},
					{
						rooms_name: "ALRD_121",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-121"
					},
					{
						rooms_name: "ALRD_B101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-B101"
					},
					{
						rooms_name: "ANSO_202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANSO-202"
					},
					{
						rooms_name: "ANSO_203",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANSO-203"
					},
					{
						rooms_name: "ANSO_205",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANSO-205"
					},
					{
						rooms_name: "ANSO_207",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANSO-207"
					},
					{
						rooms_name: "AERL_120",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/AERL-120"
					},
					{
						rooms_name: "AUDX_142",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/AUDX-142"
					},
					{
						rooms_name: "AUDX_157",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/AUDX-157"
					},
					{
						rooms_name: "BIOL_1503",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BIOL-1503"
					},
					{
						rooms_name: "BIOL_2000",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BIOL-2000"
					},
					{
						rooms_name: "BIOL_2200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BIOL-2200"
					},
					{
						rooms_name: "BIOL_2519",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BIOL-2519"
					},
					{
						rooms_name: "BRKX_2365",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BRKX-2365"
					},
					{
						rooms_name: "BRKX_2367",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BRKX-2367"
					},
					{
						rooms_name: "BUCH_A101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A101"
					},
					{
						rooms_name: "BUCH_A102",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A102"
					},
					{
						rooms_name: "BUCH_A103",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A103"
					},
					{
						rooms_name: "BUCH_A104",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A104"
					},
					{
						rooms_name: "BUCH_A201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A201"
					},
					{
						rooms_name: "BUCH_A202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A202"
					},
					{
						rooms_name: "BUCH_A203",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-A203"
					},
					{
						rooms_name: "BUCH_B141",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B141"
					},
					{
						rooms_name: "BUCH_B142",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B142"
					},
					{
						rooms_name: "BUCH_B208",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B208"
					},
					{
						rooms_name: "BUCH_B209",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B209"
					},
					{
						rooms_name: "BUCH_B210",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B210"
					},
					{
						rooms_name: "BUCH_B211",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B211"
					},
					{
						rooms_name: "BUCH_B213",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B213"
					},
					{
						rooms_name: "BUCH_B215",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B215"
					},
					{
						rooms_name: "BUCH_B216",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B216"
					},
					{
						rooms_name: "BUCH_B218",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B218"
					},
					{
						rooms_name: "BUCH_B219",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B219"
					},
					{
						rooms_name: "BUCH_B302",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B302"
					},
					{
						rooms_name: "BUCH_B303",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B303"
					},
					{
						rooms_name: "BUCH_B304",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B304"
					},
					{
						rooms_name: "BUCH_B306",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B306"
					},
					{
						rooms_name: "BUCH_B307",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B307"
					},
					{
						rooms_name: "BUCH_B308",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B308"
					},
					{
						rooms_name: "BUCH_B309",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B309"
					},
					{
						rooms_name: "BUCH_B310",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B310"
					},
					{
						rooms_name: "BUCH_B312",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B312"
					},
					{
						rooms_name: "BUCH_B313",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B313"
					},
					{
						rooms_name: "BUCH_B315",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B315"
					},
					{
						rooms_name: "BUCH_B316",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B316"
					},
					{
						rooms_name: "BUCH_B318",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B318"
					},
					{
						rooms_name: "BUCH_B319",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-B319"
					},
					{
						rooms_name: "BUCH_D201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D201"
					},
					{
						rooms_name: "BUCH_D204",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D204"
					},
					{
						rooms_name: "BUCH_D205",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D205"
					},
					{
						rooms_name: "BUCH_D207",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D207"
					},
					{
						rooms_name: "BUCH_D209",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D209"
					},
					{
						rooms_name: "BUCH_D213",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D213"
					},
					{
						rooms_name: "BUCH_D214",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D214"
					},
					{
						rooms_name: "BUCH_D216",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D216"
					},
					{
						rooms_name: "BUCH_D217",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D217"
					},
					{
						rooms_name: "BUCH_D218",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D218"
					},
					{
						rooms_name: "BUCH_D219",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D219"
					},
					{
						rooms_name: "BUCH_D221",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D221"
					},
					{
						rooms_name: "BUCH_D222",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D222"
					},
					{
						rooms_name: "BUCH_D228",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D228"
					},
					{
						rooms_name: "BUCH_D229",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D229"
					},
					{
						rooms_name: "BUCH_D301",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D301"
					},
					{
						rooms_name: "BUCH_D304",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D304"
					},
					{
						rooms_name: "BUCH_D306",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D306"
					},
					{
						rooms_name: "BUCH_D307",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D307"
					},
					{
						rooms_name: "BUCH_D312",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D312"
					},
					{
						rooms_name: "BUCH_D313",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D313"
					},
					{
						rooms_name: "BUCH_D314",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D314"
					},
					{
						rooms_name: "BUCH_D315",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D315"
					},
					{
						rooms_name: "BUCH_D316",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D316"
					},
					{
						rooms_name: "BUCH_D317",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D317"
					},
					{
						rooms_name: "BUCH_D319",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D319"
					},
					{
						rooms_name: "BUCH_D322",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D322"
					},
					{
						rooms_name: "BUCH_D323",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D323"
					},
					{
						rooms_name: "BUCH_D325",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/BUCH-D325"
					},
					{
						rooms_name: "CIRS_1250",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CIRS-1250"
					},
					{
						rooms_name: "CHBE_101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHBE-101"
					},
					{
						rooms_name: "CHBE_102",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHBE-102"
					},
					{
						rooms_name: "CHBE_103",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHBE-103"
					},
					{
						rooms_name: "CHEM_B150",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-B150"
					},
					{
						rooms_name: "CHEM_B250",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-B250"
					},
					{
						rooms_name: "CHEM_C124",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-C124"
					},
					{
						rooms_name: "CHEM_C126",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-C126"
					},
					{
						rooms_name: "CHEM_D200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-D200"
					},
					{
						rooms_name: "CHEM_D300",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CHEM-D300"
					},
					{
						rooms_name: "CEME_1202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1202"
					},
					{
						rooms_name: "CEME_1204",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1204"
					},
					{
						rooms_name: "CEME_1206",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1206"
					},
					{
						rooms_name: "CEME_1210",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1210"
					},
					{
						rooms_name: "CEME_1212",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1212"
					},
					{
						rooms_name: "CEME_1215",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/CEME-1215"
					},
					{
						rooms_name: "EOSM_135",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/EOSM-135"
					},
					{
						rooms_name: "ESB_1012",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ESB-1012"
					},
					{
						rooms_name: "ESB_1013",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ESB-1013"
					},
					{
						rooms_name: "ESB_2012",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ESB-2012"
					},
					{
						rooms_name: "FNH_20",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-20"
					},
					{
						rooms_name: "FNH_30",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-30"
					},
					{
						rooms_name: "FNH_320",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-320"
					},
					{
						rooms_name: "FNH_40",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-40"
					},
					{
						rooms_name: "FNH_50",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-50"
					},
					{
						rooms_name: "FNH_60",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FNH-60"
					},
					{
						rooms_name: "FSC_1001",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1001"
					},
					{
						rooms_name: "FSC_1002",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1002"
					},
					{
						rooms_name: "FSC_1003",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1003"
					},
					{
						rooms_name: "FSC_1005",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1005"
					},
					{
						rooms_name: "FSC_1221",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1221"
					},
					{
						rooms_name: "FSC_1402",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1402"
					},
					{
						rooms_name: "FSC_1611",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1611"
					},
					{
						rooms_name: "FSC_1613",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1613"
					},
					{
						rooms_name: "FSC_1615",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1615"
					},
					{
						rooms_name: "FSC_1617",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FSC-1617"
					},
					{
						rooms_name: "FORW_303",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FORW-303"
					},
					{
						rooms_name: "FORW_317",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FORW-317"
					},
					{
						rooms_name: "FORW_519",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FORW-519"
					},
					{
						rooms_name: "LASR_102",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-102"
					},
					{
						rooms_name: "LASR_104",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-104"
					},
					{
						rooms_name: "LASR_105",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-105"
					},
					{
						rooms_name: "LASR_107",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-107"
					},
					{
						rooms_name: "LASR_211",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-211"
					},
					{
						rooms_name: "LASR_5C",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-5C"
					},
					{
						rooms_name: "FRDM_153",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/FRDM-153"
					},
					{
						rooms_name: "GEOG_100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-100"
					},
					{
						rooms_name: "GEOG_101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-101"
					},
					{
						rooms_name: "GEOG_147",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-147"
					},
					{
						rooms_name: "GEOG_200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-200"
					},
					{
						rooms_name: "GEOG_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-201"
					},
					{
						rooms_name: "GEOG_212",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-212"
					},
					{
						rooms_name: "GEOG_214",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-214"
					},
					{
						rooms_name: "GEOG_242",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/GEOG-242"
					},
					{
						rooms_name: "HEBB_10",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HEBB-10"
					},
					{
						rooms_name: "HEBB_100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HEBB-100"
					},
					{
						rooms_name: "HEBB_12",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HEBB-12"
					},
					{
						rooms_name: "HEBB_13",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HEBB-13"
					},
					{
						rooms_name: "HENN_200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-200"
					},
					{
						rooms_name: "HENN_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-201"
					},
					{
						rooms_name: "HENN_202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-202"
					},
					{
						rooms_name: "HENN_301",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-301"
					},
					{
						rooms_name: "HENN_302",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-302"
					},
					{
						rooms_name: "HENN_304",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/HENN-304"
					},
					{
						rooms_name: "ANGU_037",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-037"
					},
					{
						rooms_name: "ANGU_039",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-039"
					},
					{
						rooms_name: "ANGU_098",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-098"
					},
					{
						rooms_name: "ANGU_232",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-232"
					},
					{
						rooms_name: "ANGU_234",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-234"
					},
					{
						rooms_name: "ANGU_235",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-235"
					},
					{
						rooms_name: "ANGU_237",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-237"
					},
					{
						rooms_name: "ANGU_241",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-241"
					},
					{
						rooms_name: "ANGU_243",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-243"
					},
					{
						rooms_name: "ANGU_254",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-254"
					},
					{
						rooms_name: "ANGU_291",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-291"
					},
					{
						rooms_name: "ANGU_292",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-292"
					},
					{
						rooms_name: "ANGU_293",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-293"
					},
					{
						rooms_name: "ANGU_295",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-295"
					},
					{
						rooms_name: "ANGU_296",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-296"
					},
					{
						rooms_name: "ANGU_332",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-332"
					},
					{
						rooms_name: "ANGU_334",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-334"
					},
					{
						rooms_name: "ANGU_335",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-335"
					},
					{
						rooms_name: "ANGU_339",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-339"
					},
					{
						rooms_name: "ANGU_343",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-343"
					},
					{
						rooms_name: "ANGU_345",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-345"
					},
					{
						rooms_name: "ANGU_347",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-347"
					},
					{
						rooms_name: "ANGU_350",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-350"
					},
					{
						rooms_name: "ANGU_354",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-354"
					},
					{
						rooms_name: "ANGU_432",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-432"
					},
					{
						rooms_name: "ANGU_434",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-434"
					},
					{
						rooms_name: "ANGU_435",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-435"
					},
					{
						rooms_name: "ANGU_437",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ANGU-437"
					},
					{
						rooms_name: "DMP_101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101"
					},
					{
						rooms_name: "DMP_110",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-110"
					},
					{
						rooms_name: "DMP_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201"
					},
					{
						rooms_name: "DMP_301",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-301"
					},
					{
						rooms_name: "DMP_310",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-310"
					},
					{
						rooms_name: "IONA_301",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IONA-301"
					},
					{
						rooms_name: "IONA_633",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IONA-633"
					},
					{
						rooms_name: "IBLC_155",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-155"
					},
					{
						rooms_name: "IBLC_156",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-156"
					},
					{
						rooms_name: "IBLC_157",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-157"
					},
					{
						rooms_name: "IBLC_158",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-158"
					},
					{
						rooms_name: "IBLC_182",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-182"
					},
					{
						rooms_name: "IBLC_185",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-185"
					},
					{
						rooms_name: "IBLC_191",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-191"
					},
					{
						rooms_name: "IBLC_192",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-192"
					},
					{
						rooms_name: "IBLC_193",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-193"
					},
					{
						rooms_name: "IBLC_194",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-194"
					},
					{
						rooms_name: "IBLC_195",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-195"
					},
					{
						rooms_name: "IBLC_261",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-261"
					},
					{
						rooms_name: "IBLC_263",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-263"
					},
					{
						rooms_name: "IBLC_264",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-264"
					},
					{
						rooms_name: "IBLC_265",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-265"
					},
					{
						rooms_name: "IBLC_266",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-266"
					},
					{
						rooms_name: "IBLC_460",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-460"
					},
					{
						rooms_name: "IBLC_461",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/IBLC-461"
					},
					{
						rooms_name: "SOWK_122",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-122"
					},
					{
						rooms_name: "SOWK_124",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-124"
					},
					{
						rooms_name: "SOWK_222",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-222"
					},
					{
						rooms_name: "SOWK_223",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-223"
					},
					{
						rooms_name: "SOWK_224",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-224"
					},
					{
						rooms_name: "SOWK_324",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-324"
					},
					{
						rooms_name: "SOWK_326",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SOWK-326"
					},
					{
						rooms_name: "LSK_200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSK-200"
					},
					{
						rooms_name: "LSK_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSK-201"
					},
					{
						rooms_name: "LSK_460",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSK-460"
					},
					{
						rooms_name: "LSK_462",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSK-462"
					},
					{
						rooms_name: "LSC_1001",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSC-1001"
					},
					{
						rooms_name: "LSC_1002",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSC-1002"
					},
					{
						rooms_name: "LSC_1003",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LSC-1003"
					},
					{
						rooms_name: "MCLD_202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-202"
					},
					{
						rooms_name: "MCLD_214",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-214"
					},
					{
						rooms_name: "MCLD_220",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-220"
					},
					{
						rooms_name: "MCLD_228",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-228"
					},
					{
						rooms_name: "MCLD_242",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-242"
					},
					{
						rooms_name: "MCLD_254",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCLD-254"
					},
					{
						rooms_name: "MCML_154",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-154"
					},
					{
						rooms_name: "MCML_158",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-158"
					},
					{
						rooms_name: "MCML_160",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-160"
					},
					{
						rooms_name: "MCML_166",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-166"
					},
					{
						rooms_name: "MCML_256",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-256"
					},
					{
						rooms_name: "MCML_260",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-260"
					},
					{
						rooms_name: "MCML_358",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-358"
					},
					{
						rooms_name: "MCML_360A",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360A"
					},
					{
						rooms_name: "MCML_360B",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360B"
					},
					{
						rooms_name: "MCML_360C",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360C"
					},
					{
						rooms_name: "MCML_360D",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360D"
					},
					{
						rooms_name: "MCML_360E",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360E"
					},
					{
						rooms_name: "MCML_360F",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360F"
					},
					{
						rooms_name: "MCML_360G",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360G"
					},
					{
						rooms_name: "MCML_360H",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360H"
					},
					{
						rooms_name: "MCML_360J",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360J"
					},
					{
						rooms_name: "MCML_360K",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360K"
					},
					{
						rooms_name: "MCML_360L",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360L"
					},
					{
						rooms_name: "MCML_360M",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MCML-360M"
					},
					{
						rooms_name: "MATH_100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-100"
					},
					{
						rooms_name: "MATH_102",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-102"
					},
					{
						rooms_name: "MATH_104",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-104"
					},
					{
						rooms_name: "MATH_105",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-105"
					},
					{
						rooms_name: "MATH_202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-202"
					},
					{
						rooms_name: "MATH_203",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-203"
					},
					{
						rooms_name: "MATH_204",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-204"
					},
					{
						rooms_name: "MATH_225",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATH-225"
					},
					{
						rooms_name: "MATX_1100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MATX-1100"
					},
					{
						rooms_name: "SCRF_100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-100"
					},
					{
						rooms_name: "SCRF_1003",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1003"
					},
					{
						rooms_name: "SCRF_1004",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1004"
					},
					{
						rooms_name: "SCRF_1005",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1005"
					},
					{
						rooms_name: "SCRF_1020",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1020"
					},
					{
						rooms_name: "SCRF_1021",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1021"
					},
					{
						rooms_name: "SCRF_1022",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1022"
					},
					{
						rooms_name: "SCRF_1023",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1023"
					},
					{
						rooms_name: "SCRF_1024",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1024"
					},
					{
						rooms_name: "SCRF_1328",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-1328"
					},
					{
						rooms_name: "SCRF_200",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-200"
					},
					{
						rooms_name: "SCRF_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-201"
					},
					{
						rooms_name: "SCRF_202",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-202"
					},
					{
						rooms_name: "SCRF_203",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-203"
					},
					{
						rooms_name: "SCRF_204",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-204"
					},
					{
						rooms_name: "SCRF_204A",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-204A"
					},
					{
						rooms_name: "SCRF_205",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-205"
					},
					{
						rooms_name: "SCRF_206",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-206"
					},
					{
						rooms_name: "SCRF_207",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-207"
					},
					{
						rooms_name: "SCRF_208",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-208"
					},
					{
						rooms_name: "SCRF_209",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-209"
					},
					{
						rooms_name: "SCRF_210",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SCRF-210"
					},
					{
						rooms_name: "ORCH_1001",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-1001"
					},
					{
						rooms_name: "ORCH_3002",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3002"
					},
					{
						rooms_name: "ORCH_3004",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3004"
					},
					{
						rooms_name: "ORCH_3016",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3016"
					},
					{
						rooms_name: "ORCH_3018",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3018"
					},
					{
						rooms_name: "ORCH_3052",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3052"
					},
					{
						rooms_name: "ORCH_3058",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3058"
					},
					{
						rooms_name: "ORCH_3062",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3062"
					},
					{
						rooms_name: "ORCH_3068",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3068"
					},
					{
						rooms_name: "ORCH_3072",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3072"
					},
					{
						rooms_name: "ORCH_3074",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-3074"
					},
					{
						rooms_name: "ORCH_4002",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4002"
					},
					{
						rooms_name: "ORCH_4004",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4004"
					},
					{
						rooms_name: "ORCH_4016",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4016"
					},
					{
						rooms_name: "ORCH_4018",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4018"
					},
					{
						rooms_name: "ORCH_4052",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4052"
					},
					{
						rooms_name: "ORCH_4058",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4058"
					},
					{
						rooms_name: "ORCH_4062",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4062"
					},
					{
						rooms_name: "ORCH_4068",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4068"
					},
					{
						rooms_name: "ORCH_4072",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4072"
					},
					{
						rooms_name: "ORCH_4074",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ORCH-4074"
					},
					{
						rooms_name: "PHRM_1101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-1101"
					},
					{
						rooms_name: "PHRM_1201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-1201"
					},
					{
						rooms_name: "PHRM_3112",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3112"
					},
					{
						rooms_name: "PHRM_3114",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3114"
					},
					{
						rooms_name: "PHRM_3115",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3115"
					},
					{
						rooms_name: "PHRM_3116",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3116"
					},
					{
						rooms_name: "PHRM_3118",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3118"
					},
					{
						rooms_name: "PHRM_3120",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3120"
					},
					{
						rooms_name: "PHRM_3122",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3122"
					},
					{
						rooms_name: "PHRM_3124",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3124"
					},
					{
						rooms_name: "PHRM_3208",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PHRM-3208"
					},
					{
						rooms_name: "PCOH_1001",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1001"
					},
					{
						rooms_name: "PCOH_1002",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1002"
					},
					{
						rooms_name: "PCOH_1003",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1003"
					},
					{
						rooms_name: "PCOH_1008",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1008"
					},
					{
						rooms_name: "PCOH_1009",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1009"
					},
					{
						rooms_name: "PCOH_1011",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1011"
					},
					{
						rooms_name: "PCOH_1215",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1215"
					},
					{
						rooms_name: "PCOH_1302",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/PCOH-1302"
					},
					{
						rooms_name: "OSBO_203A",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/OSBO-203A"
					},
					{
						rooms_name: "OSBO_203B",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/OSBO-203B"
					},
					{
						rooms_name: "OSBO_A",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/OSBO-A"
					},
					{
						rooms_name: "SPPH_143",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-143"
					},
					{
						rooms_name: "SPPH_B108",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-B108"
					},
					{
						rooms_name: "SPPH_B112",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-B112"
					},
					{
						rooms_name: "SPPH_B136",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-B136"
					},
					{
						rooms_name: "SPPH_B138",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-B138"
					},
					{
						rooms_name: "SPPH_B151",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SPPH-B151"
					},
					{
						rooms_name: "SRC_220A",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SRC-220A"
					},
					{
						rooms_name: "SRC_220B",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SRC-220B"
					},
					{
						rooms_name: "SRC_220C",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SRC-220C"
					},
					{
						rooms_name: "UCLL_101",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/UCLL-101"
					},
					{
						rooms_name: "UCLL_103",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/UCLL-103"
					},
					{
						rooms_name: "UCLL_107",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/UCLL-107"
					},
					{
						rooms_name: "UCLL_109",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/UCLL-109"
					},
					{
						rooms_name: "MGYM_206",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MGYM-206"
					},
					{
						rooms_name: "MGYM_208",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/MGYM-208"
					},
					{
						rooms_name: "WESB_100",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WESB-100"
					},
					{
						rooms_name: "WESB_201",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WESB-201"
					},
					{
						rooms_name: "SWNG_105",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-105"
					},
					{
						rooms_name: "SWNG_106",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-106"
					},
					{
						rooms_name: "SWNG_107",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-107"
					},
					{
						rooms_name: "SWNG_108",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-108"
					},
					{
						rooms_name: "SWNG_109",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-109"
					},
					{
						rooms_name: "SWNG_110",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-110"
					},
					{
						rooms_name: "SWNG_121",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-121"
					},
					{
						rooms_name: "SWNG_122",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-122"
					},
					{
						rooms_name: "SWNG_221",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-221"
					},
					{
						rooms_name: "SWNG_222",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-222"
					},
					{
						rooms_name: "SWNG_305",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-305"
					},
					{
						rooms_name: "SWNG_306",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-306"
					},
					{
						rooms_name: "SWNG_307",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-307"
					},
					{
						rooms_name: "SWNG_308",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-308"
					},
					{
						rooms_name: "SWNG_309",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-309"
					},
					{
						rooms_name: "SWNG_310",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-310"
					},
					{
						rooms_name: "SWNG_405",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-405"
					},
					{
						rooms_name: "SWNG_406",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-406"
					},
					{
						rooms_name: "SWNG_407",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-407"
					},
					{
						rooms_name: "SWNG_408",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-408"
					},
					{
						rooms_name: "SWNG_409",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-409"
					},
					{
						rooms_name: "SWNG_410",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/SWNG-410"
					},
					{
						rooms_name: "WOOD_1",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-1"
					},
					{
						rooms_name: "WOOD_2",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-2"
					},
					{
						rooms_name: "WOOD_3",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-3"
					},
					{
						rooms_name: "WOOD_4",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-4"
					},
					{
						rooms_name: "WOOD_5",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-5"
					},
					{
						rooms_name: "WOOD_6",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-6"
					},
					{
						rooms_name: "WOOD_B75",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-B75"
					},
					{
						rooms_name: "WOOD_B79",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-B79"
					},
					{
						rooms_name: "WOOD_G41",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G41"
					},
					{
						rooms_name: "WOOD_G44",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G44"
					},
					{
						rooms_name: "WOOD_G53",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G53"
					},
					{
						rooms_name: "WOOD_G55",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G55"
					},
					{
						rooms_name: "WOOD_G57",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G57"
					},
					{
						rooms_name: "WOOD_G59",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G59"
					},
					{
						rooms_name: "WOOD_G65",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G65"
					},
					{
						rooms_name: "WOOD_G66",
						rooms_href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/WOOD-G66"
					}
				]);
			} catch (err) {
				return expect.fail("should not have failed to view in browser" + err);
			}
		}).timeout(10000);
	});
});
