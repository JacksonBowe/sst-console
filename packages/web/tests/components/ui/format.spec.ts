import { afterEach, describe, expect, it, vi } from "vitest";
import { relativeTime } from "@/components/ui/format";

describe("relativeTime", () => {
	afterEach(() => vi.useRealTimers());

	it("formats recent, singular, plural, and future timestamps", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
		expect(relativeTime("2026-11-16T11:59:30Z")).toBe("just now");
		expect(relativeTime("2026-11-16T11:59:00Z")).toBe("1 minute ago");
		expect(relativeTime("2026-11-16T10:00:00Z")).toBe("2 hours ago");
		expect(relativeTime("2026-11-17T12:00:00Z")).toBe("just now");
	});

	it("handles invalid timestamps", () => {
		expect(relativeTime("not a date")).toBe("Invalid date");
	});
});
