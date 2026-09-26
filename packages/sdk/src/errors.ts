import { isAxiosError } from "axios";

export type ErrorPayload = {
	status?: number | undefined;
	code?: string | undefined;
	message?: string | undefined;
	details?: unknown;
};

export type ApiErrorOptions = {
	status?: number | undefined;
	code?: string | undefined;
	details?: unknown;
	raw?: unknown;
};

export class ApiError extends Error {
	status?: number | undefined;
	code?: string | undefined;
	details?: unknown;
	raw?: unknown;

	constructor(message: string, options: ApiErrorOptions = {}) {
		super(message);
		this.name = "ApiError";
		this.status = options.status;
		this.code = options.code;
		this.details = options.details;
		this.raw = options.raw;
	}
}

export class AuthError extends ApiError {
	constructor(message: string, options: ApiErrorOptions = {}) {
		super(message, { ...options, status: options.status ?? 401 });
		this.name = "AuthError";
	}
}

export function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;

	if (isAxiosError(error)) {
		const data = error.response?.data as ErrorPayload | undefined;
		const options = {
			status: error.response?.status,
			code: data?.code,
			details: data?.details ?? data,
			raw: error
		};
		const message = data?.message ?? error.message ?? "Request error";

		return options.status === 401
			? new AuthError(message, options)
			: new ApiError(message, options);
	}

	return new ApiError("Request error", { raw: error });
}
