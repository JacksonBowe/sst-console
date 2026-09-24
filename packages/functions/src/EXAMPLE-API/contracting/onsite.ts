import { useOrganisationId } from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import * as OnSite from "@sigil/core/contracting/job/onsite";
import { Hono } from "hono";

import {
	CreateOnSiteTaskTemplateJsonSchema,
	ListOnSiteTaskTemplateSchemaRevisionsQuerySchema,
	ListOnSiteTaskTemplatesQuerySchema,
	OnSiteTaskTemplateIdPathParamsSchema,
	OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema,
	UpdateOnSiteTaskTemplateSchemaRevisionJsonSchema,
	UpdateOnSiteTaskTemplateJsonSchema
} from "./schemas/onsite.schemas";

type Bindings = {};

const onSiteTaskTemplateRoutes = new Hono<{ Bindings: Bindings }>();

/** Lists OnSite task templates for current organisation. */
onSiteTaskTemplateRoutes.get(
	"/",
	zValidator("query", ListOnSiteTaskTemplatesQuerySchema),
	async c => {
		const organisationId = useOrganisationId();
		const { limit, cursor } = c.req.valid("query");

		const page = await OnSite.Template.list({
			organisationId,
			limit,
			cursor
		});
		return c.json(page);
	}
);

/** Creates an OnSite task template for current organisation. */
onSiteTaskTemplateRoutes.post(
	"/",
	zValidator("json", CreateOnSiteTaskTemplateJsonSchema),
	async c => {
		const organisationId = useOrganisationId();
		const input = c.req.valid("json");

		// TODO: Require onsite.task.template.create permission before creating task templates.
		const onSiteTaskTemplate = await OnSite.Template.create({
			organisationId,
			...input
		});
		return c.json(onSiteTaskTemplate, 201);
	}
);

/** Returns one OnSite task template. */
onSiteTaskTemplateRoutes.get(
	"/:taskTemplateId",
	zValidator("param", OnSiteTaskTemplateIdPathParamsSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId } = c.req.valid("param");
		const onSiteTaskTemplate = await OnSite.Template.get({
			organisationId,
			id: taskTemplateId
		});
		return c.json(onSiteTaskTemplate);
	}
);

/** Updates an OnSite task template. */
onSiteTaskTemplateRoutes.patch(
	"/:taskTemplateId",
	zValidator("param", OnSiteTaskTemplateIdPathParamsSchema),
	zValidator("json", UpdateOnSiteTaskTemplateJsonSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId } = c.req.valid("param");
		const attributes = c.req.valid("json");

		// TODO: Require onsite.task.template.update permission before updating task templates.
		const onSiteTaskTemplate = await OnSite.Template.update({
			organisationId,
			id: taskTemplateId,
			attributes
		});
		return c.json(onSiteTaskTemplate);
	}
);

/** Lists schema revisions for an OnSite task template. */
onSiteTaskTemplateRoutes.get(
	"/:taskTemplateId/schema-revisions",
	zValidator("param", OnSiteTaskTemplateIdPathParamsSchema),
	zValidator("query", ListOnSiteTaskTemplateSchemaRevisionsQuerySchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId } = c.req.valid("param");
		const { limit, cursor } = c.req.valid("query");

		const page = await OnSite.SchemaRevision.list({
			organisationId,
			taskTemplateId,
			limit,
			cursor
		});
		return c.json(page);
	}
);

/** Returns one OnSite task template schema revision. */
onSiteTaskTemplateRoutes.get(
	"/:taskTemplateId/schema-revisions/:schemaRevisionId",
	zValidator("param", OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId, schemaRevisionId } = c.req.valid("param");
		const schemaRevision = await OnSite.SchemaRevision.get({
			organisationId,
			taskTemplateId,
			schemaRevisionId
		});
		return c.json(schemaRevision);
	}
);

/** Updates a draft OnSite task template schema revision. */
onSiteTaskTemplateRoutes.patch(
	"/:taskTemplateId/schema-revisions/:schemaRevisionId",
	zValidator("param", OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema),
	zValidator("json", UpdateOnSiteTaskTemplateSchemaRevisionJsonSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId, schemaRevisionId } = c.req.valid("param");
		const { schema } = c.req.valid("json");

		const schemaRevision = await OnSite.SchemaRevision.updateDraft({
			organisationId,
			taskTemplateId,
			schemaRevisionId,
			schema
		});
		return c.json(schemaRevision);
	}
);

/** Publishes an OnSite task template schema revision. */
onSiteTaskTemplateRoutes.post(
	"/:taskTemplateId/schema-revisions/:schemaRevisionId/publish",
	zValidator("param", OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId, schemaRevisionId } = c.req.valid("param");
		const schemaRevision = await OnSite.SchemaRevision.publish({
			organisationId,
			taskTemplateId,
			schemaRevisionId
		});
		return c.json(schemaRevision);
	}
);

/** Creates a draft from a published schema revision. */
onSiteTaskTemplateRoutes.post(
	"/:taskTemplateId/schema-revisions/:schemaRevisionId/draft",
	zValidator("param", OnSiteTaskTemplateSchemaRevisionIdPathParamsSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { taskTemplateId, schemaRevisionId } = c.req.valid("param");
		const schemaRevision =
			await OnSite.SchemaRevision.createDraftFromPublished({
				organisationId,
				taskTemplateId,
				schemaRevisionId
			});
		return c.json(schemaRevision, 201);
	}
);

export { onSiteTaskTemplateRoutes as onSiteRoutes };
