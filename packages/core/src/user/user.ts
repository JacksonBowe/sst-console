import z from "zod";
import { fn } from "../util/fn";

export const get = fn(z.object({}), async () => {
	return {
		user: null,
	};
})
