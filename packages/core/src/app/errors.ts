import { NotFoundError } from "../error";

export const appErrors = {
	notFound: () => new NotFoundError("app.not_found", "SST app was not found"),
	stageNotFound: () =>
		new NotFoundError("app.stage_not_found", "SST stage was not found")
};
