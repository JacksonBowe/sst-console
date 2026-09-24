import type { Handler } from "aws-lambda";
import { Hono } from "hono";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { handle } from "hono/aws-lambda";

import { PublicError } from "@sigil/core/error";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";
import { authRoutes } from "./auth";
import { authorize, authorizeWithOrg } from "./authorizer";
import { memberRoutes } from "./member";
import { metaRoutes } from "./meta";
import { documentRoutes, uploadRoutes } from "./document";
import { organisationOrgRoutes, organisationRoutes } from "./organisation";
import { contractingRoutes } from "./contracting";
import { siteRoutes } from "./site";

type Bindings = {
	event: LambdaEvent;
	lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

/** Returns API welcome message. */
app.get("/", c => c.text("Welcome to the API!"));

app.route("/noauth", authRoutes);

const userRoutes = app.basePath("/").use("*", authorize);
userRoutes.route("/", metaRoutes);
userRoutes.route("/organisations", organisationRoutes);

const orgRoutes = app.basePath("/").use("*", authorizeWithOrg);
orgRoutes.route("/organisation", organisationOrgRoutes);
orgRoutes.route("/members", memberRoutes);
orgRoutes.route("/uploads", uploadRoutes);
orgRoutes.route("/documents", documentRoutes);
orgRoutes.route("/contracting", contractingRoutes);
orgRoutes.route("/sites", siteRoutes);

const isProd = Resource.App.stage === "prod";

function toError(e: unknown): Error {
	if (e instanceof Error) return e;
	return new Error(typeof e === "string" ? e : JSON.stringify(e));
}

function requestMeta(c: unknown) {
	const ctx = c as {
		req: { method: string; path: string; header?: (k: string) => string };
		get?: (k: string) => string;
	};
	return {
		method: ctx.req.method,
		path: ctx.req.path,
		requestId:
			ctx.get?.("requestId") ??
			ctx.req.header?.("x-request-id") ??
			undefined
	};
}

app.onError((err, c) => {
	if (err instanceof PublicError) {
		return c.json(err.toJSON(), err.status);
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

	const e = toError(err);
	const meta = requestMeta(c);

	console.error("Unhandled Error", { ...meta }, e);

	return c.json(
		{
			status: 500,
			code: "internal_error",
			message: "Something went wrong",
			...(isProd
				? {}
				: {
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
