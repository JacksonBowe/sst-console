import { NotFoundError, ServerError } from "../error";

// State use cases share these stable API error codes instead of constructing
// transport errors at individual read call sites.
export const stateErrors = {
	notFound: () =>
		new NotFoundError("state.not_found", "SST State was not found"),
	missingDiscovered: () =>
		new ServerError(
			"state.missing_discovered",
			"Discovered SST state is no longer available"
		),
	missingBootstrap: () =>
		new ServerError(
			"state.missing_bootstrap",
			"SST bootstrap metadata is empty"
		),
	invalidBootstrap: () =>
		new ServerError(
			"state.invalid_bootstrap",
			"SST bootstrap metadata does not contain state bucket"
		),
	empty: () => new ServerError("state.empty", "SST state object is empty"),
	discoveryPersistenceFailed: () =>
		new ServerError(
			"state.discovery_persistence_failed",
			"Unable to persist discovered SST state entries"
		),
	projectionRemovalFailed: (message: string) =>
		new ServerError("state.projection_removal_failed", message),
	syncPersistenceFailed: (message: string) =>
		new ServerError("state.sync_persistence_failed", message),
	projectionTooLarge: () =>
		new ServerError(
			"state.projection_too_large",
			"SST state projection exceeds DynamoDB transaction limits"
		),
	updateNotFound: () =>
		new NotFoundError(
			"state.update_not_found",
			"SST State Update was not found"
		)
};
