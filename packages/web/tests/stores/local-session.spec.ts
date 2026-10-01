import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLocalSessionStore } from "@/stores/local-session";

class MockWebSocket {
	static instances: MockWebSocket[] = [];
	readonly readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	onclose: (() => void) | null = null;

	constructor(readonly url: string) {
		MockWebSocket.instances.push(this);
	}

	close() {}
	send() {}
}

const nativeWebSocket = globalThis.WebSocket;
const nativePermissions = navigator.permissions;

describe("local session permissions", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		MockWebSocket.instances = [];
		globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
	});

	afterEach(() => {
		useLocalSessionStore().stop();
		globalThis.WebSocket = nativeWebSocket;
		Object.defineProperty(navigator, "permissions", {
			configurable: true,
			value: nativePermissions
		});
	});

	it("waits for user action when loopback permission prompts", async () => {
		setPermission("prompt");
		const localSession = useLocalSessionStore();

		await localSession.initialize();

		expect(localSession.permission).toBe("prompt");
		expect(MockWebSocket.instances).toHaveLength(0);

		localSession.enable();
		expect(MockWebSocket.instances).toHaveLength(1);
	});

	it("starts polling when loopback permission is granted", async () => {
		setPermission("granted");
		const localSession = useLocalSessionStore();

		await localSession.initialize();

		expect(MockWebSocket.instances).toHaveLength(1);
	});

	it("does not start after stopping during permission check", async () => {
		const permission = deferred<{ state: PermissionState }>();
		Object.defineProperty(navigator, "permissions", {
			configurable: true,
			value: { query: vi.fn().mockReturnValue(permission.promise) }
		});
		const localSession = useLocalSessionStore();

		const initialization = localSession.initialize();
		localSession.stop();
		permission.resolve({ state: "granted" });
		await initialization;

		expect(MockWebSocket.instances).toHaveLength(0);
	});

	it("starts polling when loopback permissions are unsupported", async () => {
		Object.defineProperty(navigator, "permissions", {
			configurable: true,
			value: {
				query: vi.fn().mockRejectedValue(new TypeError("Unsupported"))
			}
		});
		const localSession = useLocalSessionStore();

		await localSession.initialize();

		expect(localSession.permission).toBe("unsupported");
		expect(MockWebSocket.instances).toHaveLength(1);
	});
});

function setPermission(state: PermissionState) {
	Object.defineProperty(navigator, "permissions", {
		configurable: true,
		value: { query: vi.fn().mockResolvedValue({ state }) }
	});
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(complete => {
		resolve = complete;
	});
	return { promise, resolve };
}
