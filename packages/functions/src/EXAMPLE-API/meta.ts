import { assertActor } from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import { list as listOrganisations } from "@sigil/core/organisation";
import { get as getUser } from "@sigil/core/user";
import { Hono } from "hono";

import { ListOrganisationsQuerySchema } from "./schemas/organisation.schemas";

type Bindings = {};

const metaRoutes = new Hono<{ Bindings: Bindings }>();

/** Returns current authenticated user. */
metaRoutes.get("/me", async c => {
	const actor = assertActor("user");
	const user = await getUser({ userId: actor.properties.userId });
	return c.json(user);
});

/** Lists organisations available to current user. */
metaRoutes.get(
	"/me/organisations",
	zValidator("query", ListOrganisationsQuerySchema),
	async c => {
		const memberId = assertActor("user").properties.userId;
		const { limit, cursor } = c.req.valid("query");

		const page = await listOrganisations({ memberId, limit, cursor });
		return c.json(page);
	}
);

export { metaRoutes };
