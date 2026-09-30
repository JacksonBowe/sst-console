import { describe, expect, it } from "vitest";

import { parseJsonResponseBody } from "@/util/response";

describe("parseJsonResponseBody", () => {
	it("parses a JSON Lambda response body without mutation", () => {
		const output = {
			statusCode: 200,
			body: '{"id":"response-1"}'
		};

		expect(parseJsonResponseBody(output)).toEqual({
			statusCode: 200,
			body: { id: "response-1" }
		});
		expect(output.body).toBe('{"id":"response-1"}');
	});

	it("parses a nested response body", () => {
		const output = {
			response: { statusCode: 200, body: '{"id":"response-1"}' }
		};

		expect(parseJsonResponseBody(output)).toEqual({
			response: { statusCode: 200, body: { id: "response-1" } }
		});
	});

	it("keeps non-JSON response bodies unchanged", () => {
		const output = { response: { body: "Internal server error" } };

		expect(parseJsonResponseBody(output)).toBe(output);
	});
});
