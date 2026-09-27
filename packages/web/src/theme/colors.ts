export const themeColors = {
	light: {
		primary: "#3659d9",
		secondary: "#637083",
		accent: "#5b6ee1",
		positive: "#27865a",
		negative: "#c33c4c",
		warning: "#ae7318",
		info: "#3d70ca",
		dark: "#171b23",
		"dark-page": "#11151c",
		page: "#f6f7f9",
		border: "#dce0e7",
		"text-primary": "#1e2530",
		"text-secondary": "#465264",
		"text-muted": "#6d7888",
		"focus-ring": "#3659d9"
	},
	dark: {
		primary: "#93a7ff",
		secondary: "#c0c8d4",
		accent: "#a9b9ff",
		positive: "#5bbb88",
		negative: "#f07b89",
		warning: "#dfaa52",
		info: "#81aaff",
		dark: "#171b23",
		"dark-page": "#11151c",
		page: "#11151c",
		border: "#303946",
		"text-primary": "#edf1f7",
		"text-secondary": "#c0c8d4",
		"text-muted": "#929dad",
		"focus-ring": "#93a7ff"
	}
} as const;

export type ThemeMode = keyof typeof themeColors;
export type ThemeColorKey = keyof (typeof themeColors)[ThemeMode];
