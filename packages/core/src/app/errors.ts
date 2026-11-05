import { NotFoundError, ServerError } from "../error";

export const appErrors = {
	notFound: () => new NotFoundError("app.not_found", "SST app was not found"),
	stageNotFound: () =>
		new NotFoundError("app.stage_not_found", "SST stage was not found"),
	resourceRemovalFailed: () =>
		new ServerError(
			"stage_resource_removal_failed",
			"Unable to remove Stage Resources"
		),
	accountProjectionRemovalFailed: (message: string) =>
		new ServerError("state.projection_removal_failed", message),
	projectionTooLarge: () =>
		new ServerError(
			"state.projection_too_large",
			"SST state projection exceeds DynamoDB transaction limits"
		),
	projectionPersistenceFailed: () =>
		new ServerError(
			"state.sync_persistence_failed",
			"Unable to persist SST state projections"
		)
};
