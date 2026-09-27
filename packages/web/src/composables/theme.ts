import { Dark, LocalStorage, setCssVar } from "quasar";
import { readonly, ref } from "vue";

import {
	themeColors,
	type ThemeColorKey,
	type ThemeMode
} from "@/theme/colors";

const THEME_KEY = "theme";
type ThemePreference = ThemeMode;

const dark = ref(Dark.isActive);

function apply(preference: ThemePreference): void {
	dark.value = preference === "dark";
	Dark.set(dark.value);

	for (const [key, value] of Object.entries(themeColors[preference])) {
		setCssVar(key as ThemeColorKey, value);
	}
}

export function restoreTheme(): void {
	if (typeof window === "undefined") return;

	const storedPreference = LocalStorage.getItem<string>(THEME_KEY);
	const preference: ThemePreference =
		storedPreference === "light" || storedPreference === "dark"
			? storedPreference
			: window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";

	apply(preference);
}

export function useTheme() {
	function toggleTheme(): void {
		const preference: ThemePreference = dark.value ? "light" : "dark";
		apply(preference);
		LocalStorage.set(THEME_KEY, preference);
	}

	return { dark: readonly(dark), toggleTheme };
}
