import { defineConfig } from "oxfmt";

export default defineConfig({
	$schema: "./node_modules/oxfmt/configuration_schema.json",

	ignorePatterns: [
		"**/node_modules/",
		"**/dist/",
		"**/.quasar/",
		"**/.sst/",
		"**/src-cordova/",
		"**/src-capacitor/",
		"**/quasar.config.*.temporary.compiled*",
		"**/migrations/",
		"**/src/router/typed-router.d.ts",
		"**/sst-env.d.ts"
	],

	printWidth: 80,
	tabWidth: 4,
	useTabs: true,
	arrowParens: "avoid",
	bracketSpacing: true,
	bracketSameLine: false,
	htmlWhitespaceSensitivity: "strict",
	semi: true,
	singleQuote: false,
	quoteProps: "as-needed",
	trailingComma: "none",
	vueIndentScriptAndStyle: false
});
