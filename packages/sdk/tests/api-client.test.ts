import {
	AxiosError,
	AxiosHeaders,
	type InternalAxiosRequestConfig
} from "axios";
import { describe, expect, it, vi } from "vitest";

import { createClient } from "../src/api-client";

function unauthorized(config: InternalAxiosRequestConfig) {
	return new AxiosError(
		"Unauthorized",
		"ERR_BAD_REQUEST",
		config,
		undefined,
		{
			data: {
				status: 401,
				code: "user.invalid_credentials",
				message: "Invalid email or password"
			},
			status: 401,
			statusText: "Unauthorized",
			headers: new AxiosHeaders(),
			config
		}
	);
}

describe("API authentication", () => {
	it("preserves login errors without refreshing or sending a session token", async () => {
		const refreshSession = vi.fn();
		const onAuthFailure = vi.fn();
		const client = createClient({
			baseUrl: "https://example.invalid",
			getAccessToken: () => "existing-token",
			refreshSession,
			onAuthFailure
		});
		client.axios.defaults.adapter = async config => {
			expect(config.headers.Authorization).toBeUndefined();
			throw unauthorized(config);
		};

		await expect(
			client.login({ email: "test@example.invalid", password: "wrong" })
		).rejects.toMatchObject({
			message: "Invalid email or password",
			status: 401,
			code: "user.invalid_credentials"
		});
		expect(refreshSession).not.toHaveBeenCalled();
		expect(onAuthFailure).not.toHaveBeenCalled();
	});

	it("refreshes and retries an unauthorized protected request", async () => {
		const refreshSession = vi
			.fn()
			.mockResolvedValue({ accessToken: "new-token" });
		const client = createClient({
			baseUrl: "https://example.invalid",
			refreshSession
		});
		let attempts = 0;
		client.axios.defaults.adapter = async config => {
			if (++attempts === 1) throw unauthorized(config);
			expect(config.headers.Authorization).toBe("Bearer new-token");
			return {
				data: "ok",
				status: 200,
				statusText: "OK",
				headers: new AxiosHeaders(),
				config
			};
		};

		await expect(client.request({ url: "/protected" })).resolves.toBe("ok");
		expect(refreshSession).toHaveBeenCalledOnce();
		expect(attempts).toBe(2);
	});
});
