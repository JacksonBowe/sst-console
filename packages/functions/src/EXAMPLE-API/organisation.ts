import { useOrganisationId } from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import * as Organisation from "@sigil/core/organisation";
import { Hono } from "hono";

import {
	CreateOrganisationJsonSchema,
	ListOrganisationsQuerySchema,
	SearchOrganisationsQuerySchema,
	TargetOrgPathParamsSchema,
	UpdateOrganisationJsonSchema
} from "./schemas/organisation.schemas";

type Bindings = {};

const organisationRoutes = new Hono<{ Bindings: Bindings }>();

/** Searches organisations by query. */
organisationRoutes.get(
	"/search",
	zValidator("query", SearchOrganisationsQuerySchema),
	async c => {
		const input = c.req.valid("query");
		const page = await Organisation.search(input);
		return c.json(page);
	}
);

/** Creates an organisation. */
organisationRoutes.post(
	"/",
	zValidator("json", CreateOrganisationJsonSchema),
	async c => {
		const input = c.req.valid("json");
		const organisation = await Organisation.create(input);
		return c.json(organisation, 201);
	}
);

/** Lists organisations. */
organisationRoutes.get(
	"/",
	zValidator("query", ListOrganisationsQuerySchema),
	async c => {
		const { limit, cursor } = c.req.valid("query");
		const page = await Organisation.list({ limit, cursor });
		return c.json(page);
	}
);

/** Returns one organisation. */
organisationRoutes.get(
	"/:targetOrgId",
	zValidator("param", TargetOrgPathParamsSchema),
	async c => {
		const { targetOrgId } = c.req.valid("param");
		const organisation = await Organisation.get({
			organisationId: targetOrgId
		});
		return c.json(organisation);
	}
);

const organisationOrgRoutes = new Hono<{ Bindings: Bindings }>();

/** Updates current organisation details. */
organisationOrgRoutes.patch(
	"/",
	zValidator("json", UpdateOrganisationJsonSchema),
	async c => {
		const organisationId = useOrganisationId();
		const input = c.req.valid("json");
		// TODO: Require organisation.manage permission before updating organisation details.
		const organisation = await Organisation.update({
			organisationId,
			...input
		});
		return c.json(organisation);
	}
);

export { organisationOrgRoutes, organisationRoutes };
