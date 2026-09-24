import {
	assertOrganisationPermission,
	useOrganisationId
} from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import * as Site from "@sigil/core/site";
import { Hono } from "hono";

import {
	CreateSiteContactJsonSchema,
	CreateSiteJsonSchema,
	ListSitesQuerySchema,
	SiteContactPathParamsSchema,
	SitePathParamsSchema,
	UpdateSiteContactJsonSchema,
	UpdateSiteJsonSchema
} from "./schemas/site.schemas";

const siteRoutes = new Hono();

siteRoutes.get("/", zValidator("query", ListSitesQuerySchema), async c => {
	assertOrganisationPermission("site.view");
	const organisationId = useOrganisationId();
	return c.json(await Site.list({ organisationId, ...c.req.valid("query") }));
});

siteRoutes.post("/", zValidator("json", CreateSiteJsonSchema), async c => {
	assertOrganisationPermission("site.create");
	const organisationId = useOrganisationId();
	return c.json(
		await Site.create({ organisationId, ...c.req.valid("json") }),
		201
	);
});

siteRoutes.get(
	"/:siteId",
	zValidator("param", SitePathParamsSchema),
	async c => {
		assertOrganisationPermission("site.view");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.get({ organisationId, ...c.req.valid("param") })
		);
	}
);

siteRoutes.patch(
	"/:siteId",
	zValidator("param", SitePathParamsSchema),
	zValidator("json", UpdateSiteJsonSchema),
	async c => {
		assertOrganisationPermission("site.update");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.update({
				organisationId,
				...c.req.valid("param"),
				...c.req.valid("json")
			})
		);
	}
);

siteRoutes.delete(
	"/:siteId",
	zValidator("param", SitePathParamsSchema),
	async c => {
		assertOrganisationPermission("site.delete");
		const organisationId = useOrganisationId();
		await Site.remove({ organisationId, ...c.req.valid("param") });
		return c.json({ success: true });
	}
);

siteRoutes.get(
	"/:siteId/contacts",
	zValidator("param", SitePathParamsSchema),
	async c => {
		assertOrganisationPermission("site.view");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.Contact.list({
				organisationId,
				...c.req.valid("param")
			})
		);
	}
);

siteRoutes.post(
	"/:siteId/contacts",
	zValidator("param", SitePathParamsSchema),
	zValidator("json", CreateSiteContactJsonSchema),
	async c => {
		assertOrganisationPermission("site.create");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.Contact.create({
				organisationId,
				...c.req.valid("param"),
				...c.req.valid("json")
			}),
			201
		);
	}
);

siteRoutes.get(
	"/:siteId/contacts/:contactId",
	zValidator("param", SiteContactPathParamsSchema),
	async c => {
		assertOrganisationPermission("site.view");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.Contact.get({
				organisationId,
				...c.req.valid("param")
			})
		);
	}
);

siteRoutes.patch(
	"/:siteId/contacts/:contactId",
	zValidator("param", SiteContactPathParamsSchema),
	zValidator("json", UpdateSiteContactJsonSchema),
	async c => {
		assertOrganisationPermission("site.update");
		const organisationId = useOrganisationId();
		return c.json(
			await Site.Contact.update({
				organisationId,
				...c.req.valid("param"),
				...c.req.valid("json")
			})
		);
	}
);

siteRoutes.delete(
	"/:siteId/contacts/:contactId",
	zValidator("param", SiteContactPathParamsSchema),
	async c => {
		assertOrganisationPermission("site.delete");
		const organisationId = useOrganisationId();
		await Site.Contact.remove({
			organisationId,
			...c.req.valid("param")
		});
		return c.json({ success: true });
	}
);

export { siteRoutes };
