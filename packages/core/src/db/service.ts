import { Service } from "electrodb";
import { Resource } from "sst";

import { accountEntity } from "../account/account.dynamo";
import { appEntity, resourceEntity, stageEntity } from "../app/app.dynamo";
import {
	discoveredStageEntity,
	stateSnapshotEntity,
	syncRunEntity
} from "../state/state.dynamo";
import { userEntity, userIdentityEntity } from "../user/user.dynamo";
import {
	issueEntity,
	issueSubscriberEntity,
	issueSubscriptionEntity
} from "../issue/issue.dynamo";
import { alertEntity } from "../alert/alert.dynamo";
import { alertTargetEntity } from "../alert-target/alert-target.dynamo";
import { dynamo } from "./client";

export const db = new Service(
	{
		account: accountEntity,
		app: appEntity,
		stage: stageEntity,
		resource: resourceEntity,
		stateSnapshot: stateSnapshotEntity,
		syncRun: syncRunEntity,
		discoveredStage: discoveredStageEntity,
		user: userEntity,
		userIdentity: userIdentityEntity,
		issue: issueEntity,
		issueSubscriber: issueSubscriberEntity,
		issueSubscription: issueSubscriptionEntity,
		alert: alertEntity,
		alertTarget: alertTargetEntity
	},
	{ client: dynamo, table: Resource.ConsoleData.name }
);
