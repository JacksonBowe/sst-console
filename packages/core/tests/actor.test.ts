import { describe, expect, it } from "vitest";

import { assertActor, useActor, withActor } from "../src/actor";

describe("actor context", () => {
	it("makes actor available inside its context", () => {
		const actor = {
			type: "user",
			properties: { userId: "user-id" }
		} as const;

		const result = withActor(actor, () => ({
			current: useActor(),
			asserted: assertActor("user")
		}));

		expect(result.current).toEqual(actor);
		expect(result.asserted).toEqual(actor);
	});
});
