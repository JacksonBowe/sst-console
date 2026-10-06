import { describe, expect, it } from "vitest";

import { parseError } from "../../src/issue/parser";

describe("Issue processor", () => {
	it("normalizes Lambda timestamp and request ID prefixes", () => {
		const first = parseError(
			"2026-10-05T11:30:01.639Z\t7638a295-b9b4-441b-971a-a463de368535\tERROR\tThis a test console.log error"
		);
		const second = parseError(
			"2026-10-05T11:32:55.685Z\t234fedbd-388a-4239-b57d-7309f0241078\tERROR\tThis a test console.log error"
		);

		expect(first).toEqual({
			error: "ConsoleError",
			message: "This a test console.log error"
		});
		expect(second).toEqual(first);
	});

	it("keeps different error messages distinct", () => {
		expect(
			parseError(
				"2026-10-05T11:30:01.639Z\t7638a295-b9b4-441b-971a-a463de368535\tERROR\tFirst error"
			)
		).not.toEqual(
			parseError(
				"2026-10-05T11:32:55.685Z\t234fedbd-388a-4239-b57d-7309f0241078\tERROR\tSecond error"
			)
		);
	});
});
