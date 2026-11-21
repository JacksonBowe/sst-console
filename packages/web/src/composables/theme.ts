import { Dark, setCssVar } from "quasar";
import { storeToRefs, type Pinia } from "pinia";
import { readonly, ref } from "vue";

import { useUISettingsStore, type ColorScheme } from "@/stores/ui-settings";
import {
	themeColors,
	type ThemeColorKey,
	type ThemeMode
} from "@/theme/colors";

const dark = ref(Dark.isActive);
let systemTheme: MediaQueryList | undefined;

function apply(mode: ThemeMode): void {
	dark.value = mode === "dark";
	Dark.set(dark.value);

	for (const [key, value] of Object.entries(themeColors[mode])) {
		setCssVar(key as ThemeColorKey, value, document.documentElement);
	}
}

function applyPreference(preference: ColorScheme): void {
	const mode =
		preference === "system"
			? systemTheme?.matches
				? "dark"
				: "light"
			: preference;
	apply(mode);
}

export function restoreTheme(pinia?: Pinia): void {
	if (typeof window === "undefined") return;

	const settings = useUISettingsStore(pinia);
	if (!systemTheme) {
		systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
		systemTheme.addEventListener("change", () => {
			if (settings.colorScheme === "system")
				applyPreference(settings.colorScheme);
		});
	}
	applyPreference(settings.colorScheme);
}

export function useTheme() {
	const settings = useUISettingsStore();
	const { colorScheme } = storeToRefs(settings);

	function setTheme(value: ColorScheme): void {
		settings.setColorScheme(value);
		applyPreference(value);
	}

	function toggleTheme(): void {
		setTheme(dark.value ? "light" : "dark");
	}

	return {
		dark: readonly(dark),
		preference: readonly(colorScheme),
		setTheme,
		toggleTheme
	};
}
