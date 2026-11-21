import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getItem: vi.fn(),
	set: vi.fn(),
	setDark: vi.fn(),
	setCssVar: vi.fn()
}));

vi.mock("quasar", () => ({
	Dark: { isActive: false, set: mocks.setDark },
	setCssVar: mocks.setCssVar
}));

vi.mock("@/util/storage", () => ({
	loadPersisted: mocks.getItem,
	savePersisted: mocks.set
}));

describe("theme preference", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});
	afterEach(() => vi.unstubAllGlobals());

	it("follows system changes only while system is selected", async () => {
		let listener: (event: MediaQueryListEvent) => void = () => {};
		const media = {
			matches: false,
			addEventListener: vi.fn((_type, callback) => {
				listener = callback;
			})
		};
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => media)
		);
		const { createPinia, setActivePinia } = await import("pinia");
		setActivePinia(createPinia());
		const { restoreTheme, useTheme } = await import("@/composables/theme");
		restoreTheme();
		const theme = useTheme();
		expect(theme.preference.value).toBe("system");
		expect(theme.dark.value).toBe(false);

		media.matches = true;
		listener({ matches: true } as MediaQueryListEvent);
		expect(theme.dark.value).toBe(true);

		theme.setTheme("light");
		expect(mocks.set).toHaveBeenCalledWith("ui-settings", {
			colorScheme: "light",
			contentWidth: "centered"
		});
		listener({ matches: true } as MediaQueryListEvent);
		expect(theme.dark.value).toBe(false);

		theme.setTheme("system");
		expect(theme.dark.value).toBe(true);
		expect(mocks.set).toHaveBeenCalledWith("ui-settings", {
			colorScheme: "system",
			contentWidth: "centered"
		});
	});

	it("restores a saved explicit preference", async () => {
		mocks.getItem.mockReturnValue({ colorScheme: "dark" });
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn()
			}))
		);
		const { createPinia, setActivePinia } = await import("pinia");
		setActivePinia(createPinia());
		const { restoreTheme, useTheme } = await import("@/composables/theme");
		restoreTheme();
		expect(useTheme().preference.value).toBe("dark");
		expect(useTheme().dark.value).toBe(true);
	});
});
