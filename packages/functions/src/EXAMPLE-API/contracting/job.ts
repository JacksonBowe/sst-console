import {
	assertActor,
	assertOrganisationPermission,
	useOrganisationId
} from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import * as Job from "@sigil/core/contracting/job";
import { Hono } from "hono";

import {
	CreateJobJsonSchema,
	JobIdPathParamsSchema,
	ListJobsQuerySchema,
	UpdateJobJsonSchema
} from "./schemas/job.schemas";

const jobRoutes = new Hono();

/** Lists Jobs for current organisation. */
jobRoutes.get("/", zValidator("query", ListJobsQuerySchema), async c => {
	assertOrganisationPermission("job.view");
	const organisationId = useOrganisationId();
	const input = c.req.valid("query");

	return c.json(await Job.list({ organisationId, ...input }));
});

/** Creates a draft Job for current organisation. */
jobRoutes.post("/", zValidator("json", CreateJobJsonSchema), async c => {
	assertOrganisationPermission("job.create");
	const organisationId = useOrganisationId();
	const actor = assertActor("user");
	const input = c.req.valid("json");
	const job = await Job.create({
		organisationId,
		createdByUserId: actor.properties.userId,
		...input
	});

	return c.json(job, 201);
});

/** Returns one Job for current organisation. */
jobRoutes.get(
	"/:jobId",
	zValidator("param", JobIdPathParamsSchema),
	async c => {
		assertOrganisationPermission("job.view");
		const organisationId = useOrganisationId();
		const { jobId } = c.req.valid("param");

		return c.json(await Job.get({ organisationId, jobId }));
	}
);

/** Updates an editable Job for current organisation. */
jobRoutes.patch(
	"/:jobId",
	zValidator("param", JobIdPathParamsSchema),
	zValidator("json", UpdateJobJsonSchema),
	async c => {
		assertOrganisationPermission("job.update");
		const organisationId = useOrganisationId();
		const { jobId } = c.req.valid("param");
		const attributes = c.req.valid("json");

		return c.json(
			await Job.updateDraft({ organisationId, jobId, attributes })
		);
	}
);

export { jobRoutes };
