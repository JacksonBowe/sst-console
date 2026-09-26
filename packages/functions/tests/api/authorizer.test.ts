import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { PublicError } from "@console/core/error";

const mocks = vi.hoisted(() => ({
	exchangeCognitoSub: vi.fn(),
	verifyAccessToken: vi.fn(),
	withActor: vi.fn((_actor, fn: () => unknown) => fn())
}));

vi.mock("@console/core/user", () => ({
	exchangeCognitoSub: mocks.exchangeCognitoSub
}));

vi.mock("@console/core/actor", () => ({
	withActor: mocks.withActor
}));

vi.mock("@console/core/util/jwt", () => ({
	verifyAccessToken: mocks.verifyAccessToken
}));

vi.mock("sst", () => ({
	Resource: {
		SSTConsoleCognitoUserPool: { id: "ap-southeast-2_pool" },
		SSTConsoleCognitoUserPoolClient: { id: "client" }
	}
}));

import { authorize, authorizeDebug } from "../../src/api/authorizer";

const originalUsername = process.env.SST_CONSOLE_DEBUG_USERNAME;
const originalPassword = process.env.SST_CONSOLE_DEBUG_PASSWORD;

afterEach(() => {
	process.env.SST_CONSOLE_DEBUG_USERNAME = originalUsername;
	process.env.SST_CONSOLE_DEBUG_PASSWORD = originalPassword;
	vi.clearAllMocks();
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

	it("validates Bearer token and binds native user actor", async () => {
		mocks.verifyAccessToken.mockResolvedValue({ sub: "cognito-sub" });
		mocks.exchangeCognitoSub.mockResolvedValue(
			"01ARZ3NDEKTSV4RRFFQ69G5FAV"
		);
		const app = new Hono();
		app.use("*", authorize);
		app.get("/", c => c.text("ok"));
		app.onError((error, c) =>
			error instanceof PublicError
				? c.json({ code: error.code }, error.status)
				: c.text("error", 500)
		);

		const response = await app.request("/", {
			headers: { Authorization: "Bearer access-token" }
		});

		expect(response.status).toBe(200);
		expect(mocks.verifyAccessToken).toHaveBeenCalledWith({
			token: "access-token",
			poolId: "ap-southeast-2_pool",
			clientId: "client"
		});
		expect(mocks.withActor).toHaveBeenCalledWith(
			{
				type: "user",
				properties: { userId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" }
			},
			expect.any(Function)
		);
	});
});
