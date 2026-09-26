// ---------------------------------------------------------------------------
// Server-only error machinery.
// Pure error contracts (PublicErrorSchema, ULID helpers, zBoolQuery) live in
// ./error/schema and are re-exported here for backend convenience.
// ---------------------------------------------------------------------------
import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

export const zValidator = <
	T extends z.ZodType,
	Target extends keyof ValidationTargets
>(
	target: Target,
	schema: T
) =>
	zv(target, schema, result => {
		if (!result.success) {
			throw new InputError(
				"validation_error",
				`Invalid input: ${target}`,
				result.error.issues
			);
		}
	});

// This may be handled by z.ulid()
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export function isULID() {
	return z.string().regex(ULID_REGEX, {
		message: "Must be a valid ULID"
	});
}
export type ULID = z.infer<ReturnType<typeof isULID>>;

// ---------------------------------------------------------------------------
// Boolean query string preprocessor
// ---------------------------------------------------------------------------
// true/false/1/0/yes/no/on/off (case-insensitive)
// empty/missing -> undefined
export const zBoolQuery = z.preprocess(v => {
	if (typeof v === "string") {
		const s = v.trim().toLowerCase();
		if (s === "") return undefined;
		if (["true", "1", "t", "yes", "y", "on"].includes(s)) return true;
		if (["false", "0", "f", "no", "n", "off"].includes(s)) return false;
		return undefined; // unknown token -> treat as unset
	}
	return v;
}, z.boolean().optional());

// ---------------------------------------------------------------------------
// PublicError contract
// ---------------------------------------------------------------------------
// Stable shape returned by the API for client-visible errors. The server-side
// PublicError class (see ../error.ts) extends Hono's HTTPException and conforms
// to this schema so the SDK can rely on a single shape.

export const PublicErrorSchema = z.object({
	code: z.string().min(1),
	message: z.string(),
	status: z.number().int().min(100).max(599),
	details: z.unknown().optional()
});

export type PublicErrorPayload = z.infer<typeof PublicErrorSchema>;

/**
 * Server-side error class. The HTTP layer serialises instances of this class
 * into JSON conforming to {@link PublicErrorSchema}.
 */
export class PublicError extends HTTPException implements PublicErrorPayload {
	constructor(
		public override status: ContentfulStatusCode,
		public code: string,
		public override message: string,
		public details?: unknown
	) {
		super(status, { message });
	}
}

export class InputError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(400, code, message, details);
	}
}

export class AuthError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(401, code, message, details);
	}
}

export class NotFoundError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(404, code, message, details);
	}
}

export class ConflictError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(409, code, message, details);
	}
}

export class ServerError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(500, code, message, details);
	}
}

export class UnhandledServerError extends ServerError {
	constructor(message: string, details?: unknown) {
		super("unhandled_exception", message, details);
	}
}
