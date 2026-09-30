import type { LocalInvocation, LocalInvocationStatus } from "./types";

type InvocationStatusInput = Pick<LocalInvocation, "end" | "errors" | "output">;

const statusDisplay: Record<
	LocalInvocationStatus,
	{ label: string; color: string; icon: string }
> = {
	pending: {
		label: "Running",
		color: "warning",
		icon: "sym_r_progress_activity"
	},
	success: {
		label: "Success",
		color: "positive",
		icon: "sym_r_check_circle"
	},
	application_error: {
		label: "Error",
		color: "warning",
		icon: "sym_r_error"
	},
	platform_error: {
		label: "Error",
		color: "negative",
		icon: "sym_r_error"
	}
};

export function localInvocationStatus(
	invocation: InvocationStatusInput
): LocalInvocationStatus {
	if (invocation.errors.length) return "platform_error";
	if (localInvocationHttpStatus(invocation.output) !== undefined)
		return "application_error";
	return invocation.end === undefined ? "pending" : "success";
}

export function localInvocationHttpStatus(output: unknown): number | undefined {
	const response =
		isRecord(output) && isRecord(output.response)
			? output.response
			: output;
	if (!isRecord(response) || !isHttpErrorStatus(response.statusCode))
		return undefined;
	return response.statusCode;
}

export function localInvocationStatusDisplay(status: LocalInvocationStatus) {
	return statusDisplay[status];
}

function isHttpErrorStatus(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 400 &&
		value <= 599
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
