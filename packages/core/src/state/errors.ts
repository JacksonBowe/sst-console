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
	/** Reports failure to remove State Update history. */
	historyRemovalFailed: () =>
		new ServerError(
			"state_history_removal_failed",
			"Unable to remove State Update history"
		),
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
		),
	/** Reports malformed or incomplete Update artifacts. */
	updateTimestampMissing: () =>
		new ServerError(
			"state.update_timestamp_missing",
			"State Update has no timestamp"
		),
	updateEmpty: () =>
		new ServerError("state.update_empty", "Update object is empty"),
	updateInvalid: () =>
		new ServerError("state.update_invalid", "Invalid Update artifact"),
	/** Reports failure to persist live or historical Updates. */
	updatePersistenceFailed: () =>
		new ServerError(
			"state.update_persistence_failed",
			"Unable to persist State Update"
		),
	historicalUpdatePersistenceFailed: () =>
		new ServerError(
			"state.historical_update_persistence_failed",
			"Unable to persist historical State Update"
		),
	/** Reports invalid or inaccessible Snapshot observations. */
	snapshotEmpty: () =>
		new ServerError("state.snapshot_empty", "Snapshot object is empty"),
	snapshotResourcesMissing: () =>
		new ServerError(
			"state.snapshot_resources_missing",
			"Snapshot has no resource list"
		),
	snapshotTimestampMissing: () =>
		new ServerError(
			"state.snapshot_timestamp_missing",
			"Snapshot has no LastModified timestamp"
		),
	snapshotMissingAfterWrite: () =>
		new ServerError(
			"state.snapshot_missing_after_write",
			"State Snapshot not found after write"
		),
	snapshotPersistenceFailed: () =>
		new ServerError(
			"state.snapshot_persistence_failed",
			"Unable to persist State Snapshot"
		),
	snapshotHistoryReconciliationFailed: () =>
		new ServerError(
			"state.snapshot_history_reconciliation_failed",
			"Unable to reconcile State Snapshot history"
		),
	/** Reports Event Log locator failures. */
	eventLogPersistenceFailed: () =>
		new ServerError(
			"state.event_log_persistence_failed",
			"Unable to persist State Event Log"
		),
	eventPersistenceFailed: () =>
		new ServerError(
			"state.event_persistence_failed",
			"Unable to persist State Events"
		),
	eventLogTimestampMissing: () =>
		new ServerError(
			"state.event_log_timestamp_missing",
			"Event Log has no LastModified timestamp"
		),
	/** Reports incomplete manual backfill setup or listing. */
	backfillBucketMissing: () =>
		new ServerError(
			"state.backfill_bucket_missing",
			"Account is not connected to a State bucket"
		),
	backfillListingIncomplete: () =>
		new ServerError(
			"state.backfill_listing_incomplete",
			"Incomplete artifact listing"
		),
	/** Reports malformed SST checkpoints. */
	invalidJson: () =>
		new ServerError(
			"state.invalid_json",
			"SST state object is not valid JSON"
		),
	unsupportedCheckpoint: () =>
		new ServerError(
			"state.unsupported_checkpoint",
			"SST state object is not a supported Pulumi checkpoint"
		),
	invalidTimestamp: () =>
		new ServerError(
			"state.invalid_timestamp",
			"Invalid SST state timestamp"
		),
	/** Avoid replaying untracked, excluded, or differently owned Stages. */
	stageNotTracked: () =>
		new NotFoundError(
			"state.stage_not_tracked",
			"Stage is not tracked in this account"
		)
};
