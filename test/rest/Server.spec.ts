import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {clearDisk} from "../TestUtil";
import fs from "fs-extra";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;

	before(function () {
		clearDisk();
		facade = new InsightFacade();
		server = new Server(4321);
		try {
			server.start();
		} catch (err) {
			console.log(err);
		}
	});

	after(function () {
		try {
			server.stop();
		} catch (err) {
			console.log(err);
		}
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	it("GET test for zero datasets", function () {
		try {
			return request("localhost:4321")
				.get("/datasets")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.body.result).to.be.deep.equal([]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for courses dataset", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/sections/sections")
				.send(fs.readFileSync("test/resources/archives/pairSmall.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.body.result).to.be.deep.equal(["sections"]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for invalid dataset", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/invalid/sections")
				.send(fs.readFileSync("test/resources/archives/pairInvalidSection.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body.error);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for invalid dataset id", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/sections_2/sections")
				.send(fs.readFileSync("test/resources/archives/pairSmall.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body.error);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for existing dataset id", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/sections/sections")
				.send(fs.readFileSync("test/resources/archives/pairInvalidSection.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body.error);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for whitespace dataset id", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/   /sections")
				.send(fs.readFileSync("test/resources/archives/pairInvalidSection.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body.error);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("PUT test for rooms dataset after courses", function () {
		try {
			return request("localhost:4321")
				.put("/dataset/rooms/rooms")
				.send(fs.readFileSync("test/resources/archives/campusOneValidRoom.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log("Response returned");
					expect(res.body.result).to.be.deep.equal(["sections", "rooms"]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("GET test for two datasets", function () {
		try {
			return request("localhost:4321")
				.get("/datasets")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.body.result).to.be.deep.equal([
						{id: "sections", kind: "sections", numRows: 104},
						{id: "rooms", kind: "rooms", numRows: 1}]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("DELETE test for nonexistent dataset", () => {
		try {
			return request("localhost:4321")
				.delete("/dataset/invalid")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.status).to.be.equal(404);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("DELETE test for invalid dataset id", () => {
		try {
			return request("localhost:4321")
				.delete("/dataset/sections_2")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("DELETE test for whitespace dataset id", () => {
		try {
			return request("localhost:4321")
				.delete("/dataset/ /")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("DELETE test for rooms dataset", () => {
		try {
			return request("localhost:4321")
				.delete("/dataset/rooms")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.body.result).to.be.equal("rooms");
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("POST test for invalid query", () => {
		try {
			return request("localhost:4321")
				.post("/query")
				.send({
					WHAT: {
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg"
						]
					}
				})
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});

	it("POST test for valid query", () => {
		try {
			return request("localhost:4321")
				.post("/query")
				.send({
					WHERE: {
						GT: {
							sections_avg: 80
						}
					},
					OPTIONS: {
						COLUMNS: [
							"sections_avg"
						]
					}
				})
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					console.log("Response returned");
					console.log(res.body);
					expect(res.body.result).to.be.deep.equal([
						{sections_avg: 85.11},
						{sections_avg: 82.44},
						{sections_avg: 85.46},
						{sections_avg: 84.91},
						{sections_avg: 82.43},
						{sections_avg: 83.43},
						{sections_avg: 82.32},
						{sections_avg: 86.15},
						{sections_avg: 81},
						{sections_avg: 81.5}
					]);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log("Caught exception");
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log("Caught exception: " + err);
			expect.fail();
		}
	});
});
