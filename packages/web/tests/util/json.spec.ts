import { describe, expect, it } from "vitest";

import { parseJsonBody } from "@/util/json";

describe("parseJsonBody", () => {
	it("parses a root JSON body without mutation", () => {
		const output = {
			statusCode: 200,
			body: '{"id":"response-1"}'
		};

		expect(parseJsonBody(output)).toEqual({
			statusCode: 200,
			body: { id: "response-1" }
		});
		expect(output.body).toBe('{"id":"response-1"}');
	});

	it("parses a nested response body", () => {
		const output = {
			response: { statusCode: 200, body: '{"id":"response-1"}' }
		};

		expect(parseJsonBody(output)).toEqual({
			response: { statusCode: 200, body: { id: "response-1" } }
		});
	});

	it("keeps non-JSON response bodies unchanged", () => {
		const output = { response: { body: "Internal server error" } };

		expect(parseJsonBody(output)).toBe(output);
	});
});
