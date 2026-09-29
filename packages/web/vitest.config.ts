import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@sst-console/sdk": fileURLToPath(
				new URL("../sdk/src", import.meta.url)
			)
		}
	},
	test: {
		environment: "happy-dom",
		include: ["tests/**/*.spec.ts"]
	}
});
