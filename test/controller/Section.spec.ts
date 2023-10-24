import {expect} from "chai";
import {Section} from "../../src/controller/Section";

describe("Section", () => {
	const section = new Section();

	describe("validSection", () => {

		it("Should return true for a minimal valid section", () => {
			const validSection = {
				id: 123,
				Course: "CPSC110",
				Title: "Introduction to Computer Science",
				Professor: "Dr. Smith",
				Subject: "CPSC",
				Year: "2010",
				Avg: 80,
				Pass: 50,
				Fail: 10,
				Audit: 5
			};
			const result = section.validSection(validSection);
			expect(result).to.be.true;
		});

		it("Should return true for a valid section with additional fields", () => {
			const validSection = {
				tier_eighty_five:6,
				tier_ninety:4,
				Title:"",
				Section:"201",
				Detail:"",
				tier_seventy_two:0,
				Other:0,
				Low:77,
				tier_sixty_four:0,
				id:2971,
				tier_sixty_eight:0,
				tier_zero:0,
				tier_seventy_six:1,
				tier_thirty:0,
				tier_fifty:0,
				Professor:"wu, lang",
				Audit:1,
				tier_g_fifty:0,
				tier_forty:0,
				Withdrew:0,
				Year:"2011",
				tier_twenty:0,
				Stddev:4.83,
				Enrolled:15,
				tier_fifty_five:0,
				tier_eighty:3,
				tier_sixty:0,
				tier_ten:0,
				High:94,
				Course:"561",
				Session:"w",
				Pass:14,
				Fail:0,
				Avg:86.71,
				Campus:"ubc",
				Subject:"stat"
			};
			const result = section.validSection(validSection);
			expect(result).to.be.true;
		});

		it("Should return false for a null section", () => {
			const result = section.validSection(null);
			expect(result).to.be.false;
		});

		it("Should return false for a non section argument", () => {
			const result = section.validSection([1, 2, 3]);
			expect(result).to.be.false;
		});

		it("Should return false for an invalid section - has no subject", () => {
			const invalidSection = {
				id: 456,
				Course: "MATH101",
				Title: "Introduction to Mathematics",
				Professor: "Dr. Johnson",
				Year: "2015",
				Avg: 75,
				Pass: 40,
				Fail: 15,
				Audit: 8
			};
			const result = section.validSection(invalidSection);
			expect(result).to.be.false;
		});

		it("Should return false for an invalid section with additional fields", () => {
			const validSection = {
				tier_eighty_five:6,
				tier_ninety:4,
				Section:"201",
				Detail:"",
				tier_seventy_two:0,
				Other:0,
				Low:77,
				tier_sixty_four:0,
				tier_sixty_eight:0,
				tier_zero:0,
				tier_seventy_six:1,
				tier_thirty:0,
				tier_fifty:0,
				Professor:"wu, lang",
				Audit:1,
				tier_g_fifty:0,
				tier_forty:0,
				Withdrew:0,
				Year:"2011",
				tier_twenty:0,
				Stddev:4.83,
				Enrolled:15,
				tier_fifty_five:0,
				tier_eighty:3,
				tier_sixty:0,
				tier_ten:0,
				High:94,
				Course:"561",
				Session:"w",
				Pass:14,
				Fail:0,
				Subject:"stat"
			};
			const result = section.validSection(validSection);
			expect(result).to.be.false;
		});
	});

	describe("parse", () => {
		it("Should parse a minimal valid section correctly", () => {
			const validSection = {
				id: 123,
				Course: "CPSC110",
				Title: "Introduction to Computer Science",
				Professor: "Dr. Smith",
				Subject: "CPSC",
				Year: "2010",
				Avg: 80,
				Pass: 50,
				Fail: 10,
				Audit: 5
			};

			const expectedResult = {
				uuid: "123",
				id: "CPSC110",
				title: "Introduction to Computer Science",
				instructor: "Dr. Smith",
				dept: "CPSC",
				year: 2010,
				avg: 80,
				pass: 50,
				fail: 10,
				audit: 5
			};
			const result = section.parse(validSection);
			expect(result).to.deep.equal(expectedResult);
		});

		it("Should parse a valid section correctly", () => {
			const validSection = {
				tier_eighty_five:6,
				tier_ninety:4,
				Title:"",
				Section:"201",
				Detail:"",
				tier_seventy_two:0,
				Other:0,
				Low:77,
				tier_sixty_four:0,
				id:2971,
				tier_sixty_eight:0,
				tier_zero:0,
				tier_seventy_six:1,
				tier_thirty:0,
				tier_fifty:0,
				Professor:"wu, lang",
				Audit:1,
				tier_g_fifty:0,
				tier_forty:0,
				Withdrew:0,
				Year:"2011",
				tier_twenty:0,
				Stddev:4.83,
				Enrolled:15,
				tier_fifty_five:0,
				tier_eighty:3,
				tier_sixty:0,
				tier_ten:0,
				High:94,
				Course:"561",
				Session:"w",
				Pass:14,
				Fail:0,
				Avg:86.71,
				Campus:"ubc",
				Subject:"stat"
			};

			const expectedResult = {
				uuid: "2971",
				id: "561",
				title: "",
				instructor: "wu, lang",
				dept: "stat",
				year: 2011,
				avg: 86.71,
				pass: 14,
				fail: 0,
				audit: 1
			};
			const result = section.parse(validSection);
			expect(result).to.deep.equal(expectedResult);
		});

		it("Should parse a valid 'overall' section correctly", () => {
			const validSection = {
				tier_eighty_five:6,
				tier_ninety:4,
				Title:"",
				Section:"overall",
				Detail:"",
				tier_seventy_two:0,
				Other:0,
				Low:77,
				tier_sixty_four:0,
				id:2971,
				tier_sixty_eight:0,
				tier_zero:0,
				tier_seventy_six:1,
				tier_thirty:0,
				tier_fifty:0,
				Professor:"wu, lang",
				Audit:1,
				tier_g_fifty:0,
				tier_forty:0,
				Withdrew:0,
				Year:"2016",
				tier_twenty:0,
				Stddev:4.83,
				Enrolled:15,
				tier_fifty_five:0,
				tier_eighty:3,
				tier_sixty:0,
				tier_ten:0,
				High:94,
				Course:"561",
				Session:"w",
				Pass:14,
				Fail:0,
				Avg:86.71,
				Campus:"ubc",
				Subject:"stat"
			};

			const expectedResult = {
				uuid: "2971",
				id: "561",
				title: "",
				instructor: "wu, lang",
				dept: "stat",
				year: 1900,
				avg: 86.71,
				pass: 14,
				fail: 0,
				audit: 1
			};
			const result = section.parse(validSection);
			expect(result).to.deep.equal(expectedResult);
		});
	});
});
