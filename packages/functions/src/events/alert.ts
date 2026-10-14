import * as Alert from "@console/core/alert";
import * as Issue from "@console/core/issue";
import { bus } from "sst/aws/bus";

/** Dispatches matching Alerts for Console Issue events. */
export const handler = bus.subscriber(
	[Issue.Events.Created, Issue.Events.Updated],
	async event => {
		switch (event.type) {
			case Issue.Events.Created.type:
			case Issue.Events.Updated.type:
				await Alert.sendIssueAlert(event.properties.issue);
		}
	}
);
