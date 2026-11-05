import * as App from "@console/core/app";
import * as State from "@console/core/state";
import * as Issue from "@console/core/issue";
import { withActor } from "@console/core/actor";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
	[App.Events.StageProjectionRemovalRequested, App.Events.StageRemoved],
	async event =>
		withActor({ type: "system", properties: {} }, async () => {
			const input = event.properties;
			switch (event.type) {
				case App.Events.StageProjectionRemovalRequested.type: {
					const stage = await App.Stage.find(input);
					if (stage && stage.accountId !== input.accountId) return;
					if (stage) {
						await Issue.Monitoring.removeStageMonitoring(input);
						await App.Resource.remove(input);
						await State.removeStageHistory(input);
						await App.Stage.remove(input);
					}
					await bus.publish(
						Resource.Bus,
						App.Events.StageRemoved,
						input
					);
					return;
				}
				case App.Events.StageRemoved.type:
					await App.removeIfEmpty(input);
			}
		})
);
