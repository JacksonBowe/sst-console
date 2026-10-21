import { NotFoundError } from "../error";

export const issueErrors = {
	notFound: () => new NotFoundError("issue.not_found", "Issue was not found"),
	subscriptionNotFound: () =>
		new NotFoundError(
			"issue.subscription_not_found",
			"Issue subscription was not found"
		)
};
