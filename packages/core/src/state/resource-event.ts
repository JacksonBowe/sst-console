import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { chunkArray } from "../util/chunk";
import { fn } from "../util/fn";
import { StateKeySchema } from "./schema";
import { stateErrors } from "./errors";
import * as Update from "./update";

export const actionSchema = z.enum(["created", "updated", "deleted"]);
export type Action = z.infer<typeof actionSchema>;
export type ResourceIdentity = {
	urn: string;
	resourceType: string;
	parentUrn?: string;
	custom?: boolean;
};
export type EventKey = { appName: string; stageName: string; updateId: string };

export function resourceId(urn: string) {
	return createHash("sha256").update(urn).digest("hex");
}

/** Read events for an Update; unavailable Snapshot facts are not exposed. */
export const list = fn(
	StateKeySchema.extend({ updateId: z.string().min(1) }),
	async input => {
		const [events, update] = await Promise.all([
			db.entities.stateEvent.query
				.event(input)
				.go({ pages: "all", consistent: true }),
			Update.get(input)
		]);
		if (update?.comparisonStatus !== "unavailable") return events.data;
		return events.data
			.filter(event => event.operation)
			.map(event => ({ ...event, snapshot: undefined }));
	}
);

/** Upserts one source's fields without replacing facts from the other source. */
export async function writeSources(
	key: EventKey,
	events: Array<{
		identity: ResourceIdentity;
		action: Action;
		source: { snapshot: object } | { operation: object };
	}>
) {
	const unique = new Map(
		events.map(event => [
			resourceId(event.identity.urn) + "#" + event.action,
			event
		])
	);
	for (const chunk of chunkArray([...unique.values()], 90)) {
		const result = await db.transaction
			.write(({ stateEvent }) =>
				chunk.map(({ identity, action, source }) =>
					stateEvent
						.upsert({
							...key,
							resourceId: resourceId(identity.urn),
							action,
							...identity,
							...source
						})
						.commit()
				)
			)
			.go();
		if (result.canceled) throw stateErrors.eventPersistenceFailed();
	}
}

/** Remove old facts from one source before replay, retaining the other source. */
export async function clearSource(
	key: EventKey,
	source: "snapshot" | "operation"
) {
	const result = await db.entities.stateEvent.query
		.event(key)
		.go({ pages: "all", consistent: true });
	const affected = result.data.filter(event => event[source]);
	for (const chunk of chunkArray(affected, 90)) {
		const cleared = await db.transaction
			.write(({ stateEvent }) =>
				chunk.map(event => {
					const eventKey = {
						...key,
						resourceId: event.resourceId,
						action: event.action
					};
					return event[
						source === "snapshot" ? "operation" : "snapshot"
					]
						? stateEvent.patch(eventKey).remove([source]).commit()
						: stateEvent.delete(eventKey).commit();
				})
			)
			.go();
		if (cleared.canceled) throw stateErrors.eventPersistenceFailed();
	}
}

export const removeStage = fn(StateKeySchema, async input => {
	const result = await db.entities.stateEvent.query
		.event(input)
		.go({ pages: "all", consistent: true });
	for (const chunk of chunkArray(result.data, 90)) {
		const deleted = await db.transaction
			.write(({ stateEvent }) =>
				chunk.map(event => stateEvent.delete(event).commit())
			)
			.go();
		if (deleted.canceled) throw stateErrors.historyRemovalFailed();
	}
});
