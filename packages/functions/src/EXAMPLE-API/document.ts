import {
	assertActor,
	assertOrganisationPermission,
	useOrganisationId
} from "@sigil/core/actor";
import * as Document from "@sigil/core/document";
import { zValidator } from "@sigil/core/error";
import { Hono } from "hono";

import {
	CreateDocumentJsonSchema,
	CreateDocumentVersionJsonSchema,
	DocumentPathParamsSchema,
	DocumentVersionPathParamsSchema,
	ListDocumentsQuerySchema,
	PrepareDocumentUploadJsonSchema,
	ShareDocumentVersionJsonSchema
} from "./schemas/document.schemas";

const uploadRoutes = new Hono();

/** Prepares a document file upload. */
uploadRoutes.post(
	"/prepare",
	zValidator("json", PrepareDocumentUploadJsonSchema),
	async c => {
		assertOrganisationPermission("document.create");
		const organisationId = useOrganisationId();
		const actor = assertActor("user");
		const input = c.req.valid("json");
		const prepared = await Document.prepareUpload({
			organisationId,
			createdByUserId: actor.properties.userId,
			...input
		});

		return c.json(prepared, 201);
	}
);

const documentRoutes = new Hono();

/** Lists documents owned by current organisation. */
documentRoutes.get(
	"/",
	zValidator("query", ListDocumentsQuerySchema),
	async c => {
		assertOrganisationPermission("document.view");
		const organisationId = useOrganisationId();
		const input = c.req.valid("query");
		return c.json(await Document.listOwned({ organisationId, ...input }));
	}
);

/** Lists documents shared with current organisation. */
documentRoutes.get(
	"/shared",
	zValidator("query", ListDocumentsQuerySchema),
	async c => {
		assertOrganisationPermission("document.view");
		const organisationId = useOrganisationId();
		const input = c.req.valid("query");
		return c.json(await Document.listShared({ organisationId, ...input }));
	}
);

/** Creates a document from an uploaded version. */
documentRoutes.post(
	"/",
	zValidator("json", CreateDocumentJsonSchema),
	async c => {
		assertOrganisationPermission("document.create");
		const organisationId = useOrganisationId();
		const actor = assertActor("user");
		const input = c.req.valid("json");
		const document = await Document.create({
			organisationId,
			createdByUserId: actor.properties.userId,
			...input
		});

		return c.json(document, 201);
	}
);

/** Returns one document available to current organisation. */
documentRoutes.get(
	"/:documentId",
	zValidator("param", DocumentPathParamsSchema),
	async c => {
		assertOrganisationPermission("document.view");
		const organisationId = useOrganisationId();
		const { documentId } = c.req.valid("param");
		return c.json(await Document.get({ organisationId, documentId }));
	}
);

/** Adds a version to an existing document. */
documentRoutes.post(
	"/:documentId/versions",
	zValidator("param", DocumentPathParamsSchema),
	zValidator("json", CreateDocumentVersionJsonSchema),
	async c => {
		assertOrganisationPermission("document.upload_version");
		const organisationId = useOrganisationId();
		const actor = assertActor("user");
		const { documentId } = c.req.valid("param");
		const input = c.req.valid("json");
		const document = await Document.Version.create({
			organisationId,
			createdByUserId: actor.properties.userId,
			documentId,
			...input
		});

		return c.json(document, 201);
	}
);

/** Returns a download URL for a document version. */
documentRoutes.get(
	"/:documentId/versions/:versionId/url",
	zValidator("param", DocumentVersionPathParamsSchema),
	async c => {
		assertOrganisationPermission("document.view");
		const organisationId = useOrganisationId();
		const { documentId, versionId } = c.req.valid("param");
		return c.json(
			await Document.getVersionDownloadUrl({
				organisationId,
				documentId,
				versionId
			})
		);
	}
);

/** Shares a document version with another organisation. */
documentRoutes.post(
	"/:documentId/versions/:versionId/access",
	zValidator("param", DocumentVersionPathParamsSchema),
	zValidator("json", ShareDocumentVersionJsonSchema),
	async c => {
		assertOrganisationPermission("document.share");
		const organisationId = useOrganisationId();
		const actor = assertActor("user");
		const { documentId, versionId } = c.req.valid("param");
		const { granteeOrganisationId } = c.req.valid("json");
		const access = await Document.Version.share({
			organisationId,
			grantedByUserId: actor.properties.userId,
			documentId,
			versionId,
			granteeOrgId: granteeOrganisationId
		});

		return c.json(access, 201);
	}
);

export { documentRoutes, uploadRoutes };
