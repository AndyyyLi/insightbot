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
			// 	But when I got to Step 2, I didn't get the response that I expected.
			try {
				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Sections);
				expect(addRoom).to.deep.equals(["rooms"]);

				// TODO performQuery
			} catch (err) {
				return expect.fail("should not have failed to ensure total ordering of data");
			}
		});

		it("5. should view in browser", async function () {
			// I add rooms dataset for querying.
			// I invoke performQuery in search of rooms' names and links to their websites.
			// But when I got to Step 2, I didn't get the response that I expected.
			try {
				const addRoom = await facade.addDataset("rooms", rooms, InsightDatasetKind.Sections);
				expect(addRoom).to.deep.equals(["rooms"]);

				// TODO performQuery
			} catch (err) {
				return expect.fail("should not have failed to view in browser");
			}
		});
	});
});
