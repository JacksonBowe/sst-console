import { NotFoundError, ServerError } from "../error";

// State use cases share these stable API error codes instead of constructing
// transport errors at individual read call sites.
export const stateErrors = {
	/** Reports that the requested State was not found. */
	notFound: () =>
		new NotFoundError("state.not_found", "SST State was not found"),
	/** Reports that a discovered State artifact is no longer available. */
	missingDiscovered: () =>
		new ServerError(
			"state.missing_discovered",
			"Discovered SST state is no longer available"
		),
	/** Reports missing SST bootstrap metadata. */
	missingBootstrap: () =>
		new ServerError(
			"state.missing_bootstrap",
			"SST bootstrap metadata is empty"
		),
	/** Reports bootstrap metadata without a valid State bucket. */
	invalidBootstrap: () =>
		new ServerError(
			"state.invalid_bootstrap",
			"SST bootstrap metadata does not contain state bucket"
		),
	/** Reports an empty SST State object. */
	empty: () => new ServerError("state.empty", "SST state object is empty"),
	/** Reports failure to persist discovery inventory. */
	discoveryPersistenceFailed: () =>
		new ServerError(
			"state.discovery_persistence_failed",
			"Unable to persist discovered SST state entries"
		),
	/** Reports failure to remove State projections. */
	projectionRemovalFailed: (message: string) =>
		new ServerError("state.projection_removal_failed", message),
	/** Reports failure to persist a State sync. */
	syncPersistenceFailed: (message: string) =>
		new ServerError("state.sync_persistence_failed", message),
	/** Reports a projection exceeding transaction size limits. */
	projectionTooLarge: () =>
		new ServerError(
			"state.projection_too_large",
			"SST state projection exceeds DynamoDB transaction limits"
		),
	/** Reports that the requested State Update was not found. */
	updateNotFound: () =>
		new NotFoundError(
			"state.update_not_found",
			"SST State Update was not found"
		)
};
