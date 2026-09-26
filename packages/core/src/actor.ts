import { z } from "zod";

import { createContext } from "./context";
import { AuthError } from "./error";

export const SystemActor = z.object({
	type: z.literal("system"),
	properties: z.object({})
});

export const UserActor = z.object({
	type: z.literal("user"),
	properties: z.object({
		userId: z.string()
	})
});

export const PublicActor = z.object({
	type: z.literal("public"),
	properties: z.object({})
});

export const Actor = z.discriminatedUnion("type", [
	SystemActor,
	UserActor,
	PublicActor
]);

export type Actor = z.infer<typeof Actor>;

export const ActorContext = createContext<Actor>();

export const useActor = () => ActorContext.use();

export const withActor = <T>(actor: Actor, fn: () => T) =>
	ActorContext.with(actor, fn);

export function assertActor<T extends Actor["type"]>(
	type: T
): Extract<Actor, { type: T }>;

export function assertActor<const T extends readonly Actor["type"][]>(
	type: T
): Extract<Actor, { type: T[number] }>;

export function assertActor(
	type: Actor["type"] | readonly Actor["type"][]
): Actor {
	const actor = useActor();
	const allowed = Array.isArray(type) ? type : [type];
	if (!allowed.includes(actor.type)) {
		throw new AuthError(
			"invalid_actor",
			`Expected actor type ${allowed.join(" or ")}, got ${actor.type}`
		);
	}
	return actor;
}
