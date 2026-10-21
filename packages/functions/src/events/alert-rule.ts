import * as AlertRule from "@console/core/alert-rule";
import * as Issue from "@console/core/issue";
import { bus } from "sst/aws/bus";

/** Dispatches matching alert rules for Console Issue events. */
export const handler = bus.subscriber(
	[Issue.Events.Created, Issue.Events.Updated],
	async event => {
		switch (event.type) {
			case Issue.Events.Created.type:
			case Issue.Events.Updated.type:
				await AlertRule.sendIssueNotifications(event.properties.issue);
		}
	}
);
