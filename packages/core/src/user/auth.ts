import z from "zod";
import { fn } from "../util/fn";

export const auth = fn(
	z.object({
		email: z.email(),
		password: z.string()
	}),
	async input => {
		console.log("auth input", input);
		return {
			user: null
		};
	}
);
