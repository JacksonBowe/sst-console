import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: [
			{
				// The local config is ignored; tests mock the tracked example instead.
				find: /^(?:\.\.\/)+console\.config$/,
				replacement: fileURLToPath(
					new URL("../../console.config.example.ts", import.meta.url)
				)
			}
		]
	},
	test: {
		include: ["tests/**/*.test.ts"]
	}
});
