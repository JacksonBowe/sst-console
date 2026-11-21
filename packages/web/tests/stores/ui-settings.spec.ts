import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUISettingsStore } from "@/stores/ui-settings";
import { loadPersisted, savePersisted } from "@/util/storage";

vi.mock("@/util/storage", () => ({
	loadPersisted: vi.fn(),
	savePersisted: vi.fn()
}));

describe("UI settings", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setActivePinia(createPinia());
	});

	it("defaults to centered layout", () => {
		expect(useUISettingsStore().contentWidth).toBe("centered");
	});

	it("restores full width and persists changes", () => {
		vi.mocked(loadPersisted).mockReturnValue({
			contentWidth: "full",
			colorScheme: "dark"
		});
		const settings = useUISettingsStore();
		expect(settings.contentWidth).toBe("full");
		expect(settings.colorScheme).toBe("dark");

		settings.setContentWidth("centered");
		expect(settings.contentWidth).toBe("centered");
		expect(savePersisted).toHaveBeenCalledWith("ui-settings", {
			contentWidth: "centered",
			colorScheme: "dark"
		});
		settings.setColorScheme("system");
		expect(savePersisted).toHaveBeenLastCalledWith("ui-settings", {
			contentWidth: "centered",
			colorScheme: "system"
		});
	});
});
