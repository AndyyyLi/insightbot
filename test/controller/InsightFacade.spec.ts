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

				it("should reject addition of rooms dataset with no building table in index.htm",
					async function() {
						try {
							await facade.addDataset("rooms", getContentFromArchives(
								"campusIndexNoValidTable.zip"), InsightDatasetKind.Rooms);
							return expect.fail("should have rejected addition of a rooms dataset with no building" +
								" table in index.htm");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

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

				it("should reject addition of rooms dataset with no rooms table in a building.htm",
					async function() {
						try {
							await facade.addDataset("rooms", getContentFromArchives(
								"campusNoValidTableInBuildingFile.zip"), InsightDatasetKind.Rooms);
							return expect.fail("should have rejected addition of a rooms dataset with no" +
								" rooms table in a building.htm");
						} catch (err) {
							return expect(err).to.be.instanceOf(InsightError);
						}
					});

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
						const removeFirst = await facade.removeDataset("room1");
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
					return expect(removeSection).to.equals("rooms");
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
					await facade.addDataset("rooms", roomsOne, InsightDatasetKind.Sections);
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
					await facade.addDataset("rooms1", roomsOne, InsightDatasetKind.Rooms);
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
		});

		describe("Load Dataset, Handle Disk and Crashes", function () {
			beforeEach(function () {
				facade = new InsightFacade();
				clearDisk();
			});

			describe("Kind: Section", function () {
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
						await newInstance.addDataset("rooms", roomsOne, InsightDatasetKind.Rooms);
						expect.fail("should have failed to add the same dataset id to a new instance");
					} catch (err) {
						return expect(err).to.be.instanceOf(InsightError);
					}
				});

				it("should be able to add datasets on a new instance", async function () {
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
						expect(add2).to.deep.members(["rooms1", "room2"]);
						const filePath2 = path.join(__dirname, "../../data", "room2-Rooms.json");
						const fileExists2 = await fs.access(filePath2).then(() => true).catch(() => false);
						expect(fileExists2).to.be.true;
					} catch (err) {
						return expect.fail("should NOT failed to list after a crash" + err);
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
						expect(listFacade).to.have.deep.members([{
							id: "rooms1",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}, {
							id: "room2",
							kind: InsightDatasetKind.Rooms,
							numRows: 1
						}]);
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
					const fileExists1Removed = await fs.access(filePath1).then(() => true).catch(() => false);
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

	describe("PerformQuery", function () {
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
});
