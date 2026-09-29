import { defineStore } from "pinia";

import type {
	LocalConnectionStatus,
	LocalIdentity,
	LocalInvocation,
	LocalLogLine
} from "@/composables/local/types";

const MAX_INVOCATIONS = 200;
const RECONNECT_DELAY = 3_000;

type SocketInvocation = {
	id?: string;
	source?: string;
	input?: unknown;
	output?: unknown;
	start?: number;
	end?: number;
	logs?: Array<{ id?: string; timestamp?: number; message?: string }>;
	errors?: Array<{
		error?: string;
		message?: string;
		stack?: Array<{ raw?: string }>;
	}>;
	report?: { duration?: number };
};

type SocketMessage = {
	type?: string;
	properties?: unknown;
};

type LocalSessionState = {
	status: LocalConnectionStatus;
	identity?: LocalIdentity | undefined;
	invocations: LocalInvocation[];
	lastEventAt?: number | undefined;
	error?: string | undefined;
};

let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
let started = false;

export const useLocalSessionStore = defineStore("local-session", {
	state: (): LocalSessionState => ({
		status: "disconnected",
		identity: undefined,
		invocations: [],
		lastEventAt: undefined,
		error: undefined
	}),
	getters: {
		isConnected: state => state.status === "connected"
	},
	actions: {
		start() {
			if (started) return;
			started = true;
			this.connect();
		},
		stop() {
			started = false;
			this.clearReconnectTimer();
			socket?.close();
			socket = undefined;
			this.status = "disconnected";
			this.identity = undefined;
			this.invocations = [];
			this.lastEventAt = undefined;
			this.error = undefined;
		},
		clear() {
			this.invocations = [];
			if (socket?.readyState !== WebSocket.OPEN) return;
			socket.send(
				JSON.stringify({
					type: "log.cleared",
					properties: { source: "all" }
				})
			);
		},
		connect() {
			if (!started) return;
			this.clearReconnectTimer();
			this.status = "connecting";
			this.error = undefined;

			const urls = localSocketUrls();
			let index = 0;
			const attempt = () => {
				if (!started) return;
				const candidate = new WebSocket(urls[index++ % urls.length]!);
				socket = candidate;
				candidate.onopen = () => {
					if (socket !== candidate) return;
					this.status = "connected";
				};
				candidate.onmessage = event => this.receive(event.data);
				candidate.onerror = () => {
					if (socket !== candidate) return;
					this.error = "Could not connect to local SST CLI";
				};
				candidate.onclose = () => {
					if (!started || socket !== candidate) return;
					this.status = "disconnected";
					reconnectTimer = window.setTimeout(
						attempt,
						RECONNECT_DELAY
					);
				};
			};
			attempt();
		},
		receive(raw: unknown) {
			if (typeof raw !== "string") return;
			let message: SocketMessage;
			try {
				message = JSON.parse(raw) as SocketMessage;
			} catch {
				return;
			}

			if (message.type === "cli.dev" && isIdentity(message.properties)) {
				this.identity = message.properties;
				this.lastEventAt = Date.now();
				return;
			}
			if (message.type !== "invocation") return;
			this.lastEventAt = Date.now();

			const items = Array.isArray(message.properties)
				? message.properties
				: [message.properties];
			for (const item of items) {
				if (!isRecord(item) || typeof item.id !== "string") continue;
				this.upsertInvocation(item as SocketInvocation);
			}
		},
		upsertInvocation(item: SocketInvocation) {
			if (!item.id) return;
			const invocation = normalizeInvocation(item);
			const existingIndex = this.invocations.findIndex(
				current => current.id === invocation.id
			);
			const next = [...this.invocations];
			if (existingIndex === -1) next.push(invocation);
			else next.splice(existingIndex, 1, invocation);
			next.sort((left, right) => right.start - left.start);
			this.invocations = next.slice(0, MAX_INVOCATIONS);
		},
		clearReconnectTimer() {
			if (reconnectTimer !== undefined)
				window.clearTimeout(reconnectTimer);
			reconnectTimer = undefined;
		}
	}
});

function localSocketUrls() {
	return [
		"ws://localhost:13557/socket",
		"wss://localhost:13557/socket",
		"wss://localhost:14557/socket"
	];
}

function normalizeInvocation(item: SocketInvocation): LocalInvocation {
	const errors = (item.errors ?? []).map(error => ({
		error: error.error,
		message: error.message,
		stack: (error.stack ?? [])
			.map(frame => frame.raw)
			.filter((frame): frame is string => Boolean(frame))
	}));
	const logs: LocalLogLine[] = (item.logs ?? []).map((log, index) => ({
		id: log.id ?? `${item.id}-${index}`,
		timestamp: log.timestamp ?? item.start ?? Date.now(),
		message: log.message ?? ""
	}));
	const end = item.end;
	return {
		id: item.id!,
		source: item.source,
		input: item.input,
		output: item.output,
		start: item.start ?? Date.now(),
		end,
		status: errors.length ? "error" : end ? "success" : "pending",
		logs,
		errors,
		duration:
			item.report?.duration ??
			(end && item.start ? end - item.start : undefined)
	};
}

function isIdentity(value: unknown): value is LocalIdentity {
	return (
		isRecord(value) &&
		typeof value.app === "string" &&
		typeof value.stage === "string" &&
		(typeof value.region === "string" || value.region === undefined)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
