import { NotFoundError } from "../error";

// State use cases share these stable API error codes instead of constructing
// transport errors at individual read call sites.
export const stateErrors = {
	notFound: () =>
		new NotFoundError("state.not_found", "SST State was not found"),
	updateNotFound: () =>
		new NotFoundError(
			"state.update_not_found",
			"SST State Update was not found"
		)
};
