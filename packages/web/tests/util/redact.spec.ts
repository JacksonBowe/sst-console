import { describe, expect, it } from "vitest";

import { redactSensitiveData } from "@/util/redact";

describe("redactSensitiveData", () => {
	it("redacts nested standard and AWS credentials without mutation", () => {
		const value = {
			authorization: "Bearer 1234567890abcdef",
			nested: {
				api_key: "abcd1234efgh5678",
				aws_secret_access_key: "wxyz1234efgh5678",
				aws_session_token: "session1234567890"
			}
		};

		expect(redactSensitiveData(value)).toEqual({
			authorization: "Bearer 1234…cdef",
			nested: {
				api_key: "abcd…5678",
				aws_secret_access_key: "wxyz…5678",
				aws_session_token: "sess…7890"
			}
		});
		expect(value.nested.aws_secret_access_key).toBe("wxyz1234efgh5678");
	});

	it("fully masks short and non-string secret values", () => {
		expect(
			redactSensitiveData({ password: "short", token: 42, enabled: true })
		).toEqual({ password: "••••••••", token: "••••••••", enabled: true });
	});
});
