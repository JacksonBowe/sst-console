import { Service } from "electrodb";
import { Resource } from "sst";

import { accountEntity } from "../account/account.dynamo";
import { appEntity, resourceEntity, stageEntity } from "../app/app.dynamo";
import {
	discoveredStageEntity,
	stateSnapshotEntity,
	stateEventLogEntity,
	stateEventEntity,
	stateEntity,
	stateUpdateEntity
} from "../state/state.dynamo";
import { userEntity, userIdentityEntity } from "../user/user.dynamo";
import {
	issueEntity,
	issueIngressEventEntity,
	issueSubscriberEntity,
	issueSubscriptionEntity
} from "../issue/issue.dynamo";
import { alertRuleEntity } from "../alert-rule/alert-rule.dynamo";
import { notificationDestinationEntity } from "../notification-destination/notification-destination.dynamo";
import { dynamo } from "./client";

export const db = new Service(
	{
		account: accountEntity,
		app: appEntity,
		stage: stageEntity,
		resource: resourceEntity,
		state: stateEntity,
		stateUpdate: stateUpdateEntity,
		stateSnapshot: stateSnapshotEntity,
		stateEventLog: stateEventLogEntity,
		stateEvent: stateEventEntity,
		discoveredStage: discoveredStageEntity,
		user: userEntity,
		userIdentity: userIdentityEntity,
		issue: issueEntity,
		issueIngressEvent: issueIngressEventEntity,
		issueSubscriber: issueSubscriberEntity,
		issueSubscription: issueSubscriptionEntity,
		alertRule: alertRuleEntity,
		notificationDestination: notificationDestinationEntity
	},
	{ client: dynamo, table: Resource.ConsoleData.name }
);
