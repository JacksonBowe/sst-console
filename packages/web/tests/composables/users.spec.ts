import { describe, expect, it, vi } from "vitest";

const { useMutation, invalidateQueries } = vi.hoisted(() => ({
	useMutation: vi.fn(),
	invalidateQueries: vi.fn()
}));
vi.mock("@tanstack/vue-query", () => ({
	useMutation,
	useQueryClient: () => ({ invalidateQueries })
}));
vi.mock("@/boot/api-client", () => ({
	api: { setUserEnabled: vi.fn() },
	handleApiError: vi.fn()
}));

import { useSetUserEnabled } from "@/composables/users";

describe("useSetUserEnabled", () => {
	it("invalidates users after a failed access change", () => {
		useSetUserEnabled();
		const options = useMutation.mock.calls[0]?.[0];
		options.onSettled(undefined, new Error("Cognito unavailable"));
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
	});
});
