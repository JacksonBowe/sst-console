import { describe, expect, it } from "vitest";

import { localSessionStatusPresentation } from "@/components/App/Detail/Stage";

describe("Local Function session status", () => {
	it.each([
		["connecting", "Connecting"],
		["connected", "Connected"],
		["disconnected", "Disconnected"]
	] as const)("shows %s status as %s", (status, label) => {
		expect(localSessionStatusPresentation(status).label).toBe(label);
	});
});
