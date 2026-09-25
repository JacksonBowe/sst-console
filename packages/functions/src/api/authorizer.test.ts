import { afterEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { PublicError } from "@console/core/error";

import { authorizeDebug } from "./authorizer";

const originalUsername = process.env.SST_CONSOLE_DEBUG_USERNAME;
const originalPassword = process.env.SST_CONSOLE_DEBUG_PASSWORD;

afterEach(() => {
	process.env.SST_CONSOLE_DEBUG_USERNAME = originalUsername;
	process.env.SST_CONSOLE_DEBUG_PASSWORD = originalPassword;
});

describe("debug authorizer", () => {
	it("requires configured Basic credentials", async () => {
		process.env.SST_CONSOLE_DEBUG_USERNAME = "debug";
		process.env.SST_CONSOLE_DEBUG_PASSWORD = "password";
		const app = new Hono();
		app.use("*", authorizeDebug);
		app.get("/", c => c.text("ok"));
		app.onError((error, c) =>
			error instanceof PublicError
				? c.json({ code: error.code }, error.status)
				: c.text("error", 500)
		);

		const unauthorized = await app.request("/");
		expect(unauthorized.status).toBe(401);

		const authorized = await app.request("/", {
			headers: { Authorization: "Basic ZGVidWc6cGFzc3dvcmQ=" }
		});
		expect(authorized.status).toBe(200);
	});

	it("fails closed without credentials", async () => {
		delete process.env.SST_CONSOLE_DEBUG_USERNAME;
		delete process.env.SST_CONSOLE_DEBUG_PASSWORD;
		const app = new Hono();
		app.use("*", authorizeDebug);
		app.get("/", c => c.text("ok"));
		app.onError((error, c) =>
			error instanceof PublicError
				? c.json({ code: error.code }, error.status)
				: c.text("error", 500)
		);

		expect((await app.request("/")).status).toBe(500);
	});
});
