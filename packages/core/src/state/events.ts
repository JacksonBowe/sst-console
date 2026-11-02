import { z } from "zod";
import { defineEvent } from "../event";

const source = z.object({
	accountId: z.string().regex(/^\d{12}$/),
	stateBucket: z.string().min(1),
	stateKey: z.string().min(1)
});

export const Events = {
	UpdateCreated: defineEvent(
		"state.update.created",
		source.extend({ sequencer: z.string().regex(/^[0-9A-F]{256}$/) })
	),
	SnapshotCreated: defineEvent("state.snapshot.created", source),
	StateUpdated: defineEvent("state.updated", source),
	EventLogCreated: defineEvent("state.eventlog.created", source)
};
