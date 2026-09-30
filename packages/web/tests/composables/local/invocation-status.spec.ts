import { describe, expect, it } from "vitest";

import {
	localInvocationHttpStatus,
	localInvocationStatus,
	localInvocationStatusDisplay
} from "@/composables/local";

describe("localInvocationStatus", () => {
	it("prioritizes platform errors over a captured HTTP error response", () => {
		expect(
			localInvocationStatus({
				end: 1,
				output: { statusCode: 500 },
				errors: [{ stack: ["at handler"] }]
			})
		).toBe("platform_error");
	});

	it.each([
		[{ statusCode: 400 }, 400],
		[{ statusCode: 599 }, 599],
		[{ response: { statusCode: 500 } }, 500]
	])("recognizes generic HTTP error response %o", (output, statusCode) => {
		expect(localInvocationHttpStatus(output)).toBe(statusCode);
		expect(localInvocationStatus({ end: 1, output, errors: [] })).toBe(
			"application_error"
		);
	});

	it.each([
		{ statusCode: 200 },
		{ statusCode: 399 },
		{ statusCode: "500" },
		{ statusCode: 600 },
		{ response: { statusCode: 500.5 } }
	])("does not classify non-error HTTP status %o", output => {
		expect(localInvocationHttpStatus(output)).toBeUndefined();
		expect(localInvocationStatus({ end: 1, output, errors: [] })).toBe(
			"success"
		);
	});

	it("keeps incomplete invocations running", () => {
		expect(
			localInvocationStatus({
				end: undefined,
				output: undefined,
				errors: []
			})
		).toBe("pending");
	});

	it("provides shared application error display metadata", () => {
		expect(localInvocationStatusDisplay("application_error")).toEqual({
			label: "Error",
			color: "warning",
			icon: "sym_r_error"
		});
	});
});
