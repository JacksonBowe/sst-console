import {
	createBundledHighlighter,
	createSingletonShorthands
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type CodeLanguage = "json";

const createHighlighter = createBundledHighlighter({
	engine: () => createJavaScriptRegexEngine(),
	langs: {
		json: () => import("shiki/dist/langs/json.mjs")
	},
	themes: {
		"github-dark-default": () =>
			import("shiki/dist/themes/github-dark-default.mjs"),
		"github-light-default": () =>
			import("shiki/dist/themes/github-light-default.mjs")
	}
});

const { codeToHtml } = createSingletonShorthands(createHighlighter);

export function highlightCode(
	code: string,
	language: CodeLanguage,
	dark: boolean
): Promise<string> {
	return codeToHtml(code, {
		lang: language,
		theme: dark ? "github-dark-default" : "github-light-default"
	});
}
