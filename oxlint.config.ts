import { defineConfig } from "oxlint";

export default defineConfig({
	$schema: "./node_modules/oxlint/configuration_schema.json",

	ignorePatterns: [
		"**/node_modules/",
		"**/dist/",
		"**/.quasar/",
		"**/.sst/",
		"sst.config.ts",
		"**/src-cordova/",
		"**/src-capacitor/",
		"**/quasar.config.*.temporary.compiled*",
		"**/src/router/typed-router.d.ts"
	],

	options: {
		typeAware: true,
		typeCheck: true,
		maxWarnings: 10
	},

	plugins: ["typescript", "vue", "import", "eslint", "promise", "unicorn"],

	categories: {
		correctness: "error"
	},

	rules: {},

	env: {
		builtin: true
	}
});
