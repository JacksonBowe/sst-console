import { PublicError } from "@console/core/error";
import * as Account from "@console/core/account";
import * as App from "@console/core/app";
import type { Handler } from "aws-lambda";
import { Hono } from "hono";
import type { Context } from "hono";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";

import { authorizeDebug } from "./authorizer";
import { authRoutes } from "./auth";

type Bindings = {
	event: LambdaEvent;
	lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();
const isProd = Resource.App.stage === "prod";

// Base route
app.get("/", c => c.text("Welcome to the API!"));

app.route("/noauth", authRoutes);

if (!isProd) {
	const debugRoutes = new Hono<{ Bindings: Bindings }>();
	debugRoutes.use("*", authorizeDebug);
	debugRoutes.get("/accounts", async c => c.json(await Account.list()));
	debugRoutes.post("/accounts/backup-connections", async c =>
		c.json(await Account.backupConnections({}))
	);
	debugRoutes.post("/accounts/recover", async c =>
		c.json(await Account.recover({}))
	);
	debugRoutes.get("/apps", async c => c.json(await App.list()));
	debugRoutes.get("/apps/:appName/stages/:stageName", async c =>
		c.json(
			await App.inspectStage({
				appName: c.req.param("appName"),
				stageName: c.req.param("stageName")
			})
		)
	);
	debugRoutes.get("/apps/:appName", async c =>
		c.json(await App.inspect({ appName: c.req.param("appName") }))
	);
	debugRoutes.get("/accounts/:accountId", async c =>
		c.json(await Account.inspect({ accountId: c.req.param("accountId") }))
	);
	debugRoutes.get(
		"/accounts/:accountId/state/:appName/:stageName/resources",
		async c =>
			c.json(
				await Account.inspectState({
					accountId: c.req.param("accountId"),
					appName: c.req.param("appName"),
					stageName: c.req.param("stageName")
				})
			)
	);
	debugRoutes.post("/accounts/:accountId/sync", async c =>
		c.json(await Account.sync({ accountId: c.req.param("accountId") }))
	);
	app.route("/debug", debugRoutes);
}

// const protectedRoutes = app.basePath('/').use('*', authorize);

// protectedRoutes.route('/', metaRoutes);
// protectedRoutes.route('/chat', chatRoutes);
// protectedRoutes.route('/lobby', lobbyRoutes);
// protectedRoutes.route('/game', gameRoutes);
// protectedRoutes.route('/admin', adminRoutes);

function toError(e: unknown): Error {
	if (e instanceof Error) return e;
	return new Error(typeof e === "string" ? e : JSON.stringify(e));
}

function requestMeta(c: Context) {
	return {
		method: c.req.method,
		path: c.req.path,
		// if you have a request id middleware, prefer that:
		requestId:
			(c.get("requestId") as string | undefined) ??
			c.req.header("x-request-id") ??
			undefined
	};
}

app.onError((err, c) => {
	if (err instanceof PublicError) {
		return c.json(
			{
				status: err.status,
				code: err.code,
				message: err.message,
				...(err.details ? { details: err.details } : {})
			},
			err.status
		);
	}

	if (err instanceof HTTPException) {
		return c.json(
			{
				status: err.status,
				code: "http_exception",
				message: err.message
			},
			err.status
		);
	}

	// 3) Unknown error => treat as 500
	const e = toError(err);
	const meta = requestMeta(c);

	// Log the *actual* error object so you keep stack + cause
	console.error("Unhandled Error", { ...meta }, e);

	return c.json(
		{
			status: 500,
			code: "internal_error",
			message: "Something went wrong",
			...(isProd
				? {}
				: {
						// helpful during dev; avoid in prod
						debug: {
							message: e.message,
							stack: e.stack,
							name: e.name
						}
					})
		},
		500
	);
});

export const handler: Handler = handle(app);
