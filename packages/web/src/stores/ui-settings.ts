import { defineStore } from "pinia";

import { loadPersisted, savePersisted } from "@/util/storage";

const UI_SETTINGS_KEY = "ui-settings";
type ContentWidth = "centered" | "full";
export type ColorScheme = "light" | "dark" | "system";

export const useUISettingsStore = defineStore("ui-settings", {
	state: () => {
		const saved = loadPersisted<{
			contentWidth?: unknown;
			colorScheme?: unknown;
		}>(UI_SETTINGS_KEY);
		return {
			contentWidth: (saved?.contentWidth === "full"
				? "full"
				: "centered") as ContentWidth,
			colorScheme: (saved?.colorScheme === "dark" ||
			saved?.colorScheme === "light"
				? saved.colorScheme
				: "system") as ColorScheme
		};
	},
	actions: {
		setContentWidth(width: ContentWidth) {
			this.contentWidth = width;
			this.persist();
		},
		setColorScheme(scheme: ColorScheme) {
			this.colorScheme = scheme;
			this.persist();
		},
		persist() {
			savePersisted(UI_SETTINGS_KEY, {
				contentWidth: this.contentWidth,
				colorScheme: this.colorScheme
			});
		}
	}
});
