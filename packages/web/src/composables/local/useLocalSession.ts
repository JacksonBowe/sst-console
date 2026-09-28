import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import type {
	LocalConnectionStatus,
	LocalIdentity,
	LocalInvocation,
	LocalLogLine
} from "./types";

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

export function useLocalSession() {
	const status = ref<LocalConnectionStatus>("disconnected");
	const identity = ref<LocalIdentity>();
	const invocations = ref<LocalInvocation[]>([]);
	const error = ref<string>();
	let socket: WebSocket | undefined;
	let reconnectTimer: number | undefined;
	let stopped = false;

	const isConnected = computed(() => status.value === "connected");

	function clear() {
		invocations.value = [];
		if (socket?.readyState !== WebSocket.OPEN) return;
		socket.send(
			JSON.stringify({
				type: "log.cleared",
				properties: { source: "all" }
			})
		);
	}

	function connect() {
		if (stopped) return;
		clearReconnectTimer();
		status.value = "connecting";
		error.value = undefined;

		const urls = localSocketUrls();
		let index = 0;
		const attempt = () => {
			if (stopped) return;
			const url = urls[index++ % urls.length]!;
			socket?.close();
			const candidate = new WebSocket(url);
			socket = candidate;
			candidate.onopen = () => {
				if (socket !== candidate) return;
				status.value = "connected";
			};
			candidate.onmessage = event => receive(event.data);
			candidate.onerror = () => {
				if (socket !== candidate) return;
				error.value = "Could not connect to local SST CLI";
			};
			candidate.onclose = () => {
				if (stopped || socket !== candidate) return;
				status.value = "disconnected";
				identity.value = undefined;
				reconnectTimer = window.setTimeout(attempt, RECONNECT_DELAY);
			};
		};
		attempt();
	}

	function receive(raw: unknown) {
		if (typeof raw !== "string") return;
		let message: SocketMessage;
		try {
			message = JSON.parse(raw) as SocketMessage;
		} catch {
			return;
		}

		if (message.type === "cli.dev" && isIdentity(message.properties)) {
			identity.value = message.properties;
			return;
		}
		if (message.type !== "invocation") return;

		const items = Array.isArray(message.properties)
			? message.properties
			: [message.properties];
		for (const item of items) {
			if (!isRecord(item) || typeof item.id !== "string") continue;
			upsertInvocation(item as SocketInvocation);
		}
	}

	function upsertInvocation(item: SocketInvocation) {
		if (!item.id) return;
		const invocation = normalizeInvocation(item);
		const existingIndex = invocations.value.findIndex(
			current => current.id === invocation.id
		);
		const next = [...invocations.value];
		if (existingIndex === -1) next.push(invocation);
		else next.splice(existingIndex, 1, invocation);
		next.sort((left, right) => right.start - left.start);
		invocations.value = next.slice(0, MAX_INVOCATIONS);
	}

	function stop() {
		stopped = true;
		clearReconnectTimer();
		socket?.close();
		socket = undefined;
		status.value = "disconnected";
		identity.value = undefined;
	}

	function clearReconnectTimer() {
		if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
		reconnectTimer = undefined;
	}

	onMounted(connect);
	onBeforeUnmount(stop);

	return { status, identity, invocations, error, isConnected, clear };
}

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
