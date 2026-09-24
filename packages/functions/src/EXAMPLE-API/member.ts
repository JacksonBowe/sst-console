import { useOrganisationId } from "@sigil/core/actor";
import { zValidator } from "@sigil/core/error";
import { Member } from "@sigil/core/organisation";
import { Hono } from "hono";

import {
	AddMemberJsonSchema,
	ListMembersQuerySchema,
	UpdateMemberRoleJsonSchema,
	UserIdPathParamsSchema
} from "./schemas/member.schemas";

type Bindings = {};

const memberRoutes = new Hono<{ Bindings: Bindings }>();

/** Lists members in current organisation. */
memberRoutes.get("/", zValidator("query", ListMembersQuerySchema), async c => {
	const organisationId = useOrganisationId();
	const { role, limit, cursor } = c.req.valid("query");

	const page = await Member.list({ organisationId, role, limit, cursor });
	return c.json(page);
});

/** Adds a member to current organisation. */
memberRoutes.post("/", zValidator("json", AddMemberJsonSchema), async c => {
	const organisationId = useOrganisationId();
	const input = c.req.valid("json");

	// TODO: Require organisation.invite_member permission before adding members.
	const member = await Member.add({ organisationId, ...input });
	return c.json(member, 201);
});

/** Updates a member's role in current organisation. */
memberRoutes.patch(
	"/:userId/role",
	zValidator("param", UserIdPathParamsSchema),
	zValidator("json", UpdateMemberRoleJsonSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { userId } = c.req.valid("param");
		const { role } = c.req.valid("json");

		// TODO: Require organisation.update_member_role permission before changing roles.
		const member = await Member.updateRole({
			organisationId,
			userId,
			role
		});
		return c.json(member);
	}
);

/** Removes a member from current organisation. */
memberRoutes.delete(
	"/:userId",
	zValidator("param", UserIdPathParamsSchema),
	async c => {
		const organisationId = useOrganisationId();
		const { userId } = c.req.valid("param");

		// TODO: Require organisation.remove_member permission before removing members.
		await Member.remove({ organisationId, userId });
		return c.json({ success: true });
	}
);

export { memberRoutes };
