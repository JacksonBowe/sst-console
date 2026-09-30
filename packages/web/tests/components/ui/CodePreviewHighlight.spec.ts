import { describe, expect, it } from "vitest";

import { highlightCode } from "@/components/ui/CodePreview/highlight";

describe("highlightCode", () => {
	it("highlights JSON with the selected theme", async () => {
		const html = await highlightCode('{"enabled":true}', "json", false);

		expect(html).toContain('class="shiki');
		expect(html).toContain("<span");
		expect(html).toContain("enabled");
	});
});
