export type LocalConnectionStatus = "connecting" | "connected" | "disconnected";

export type LocalInvocationStatus = "pending" | "success" | "error";

export type LocalLogLine = {
	id: string;
	timestamp: number;
	message: string;
};

export type LocalInvocation = {
	id: string;
	source?: string | undefined;
	input?: unknown;
	output?: unknown;
	start: number;
	end?: number | undefined;
	status: LocalInvocationStatus;
	logs: LocalLogLine[];
	errors: Array<{
		error?: string | undefined;
		message?: string | undefined;
		stack: string[];
	}>;
	duration?: number | undefined;
};

export type LocalIdentity = {
	app: string;
	stage: string;
	region?: string;
};
