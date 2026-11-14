import { AccountIdSchema } from "../util/aws";
import { z } from "zod";
import * as Connection from "../connection";
import * as State from "../state";
import type { StageAccountConflict } from "../app/ownership";
import { fn } from "../util/fn";
import * as Account from "./account";
import { connect } from "./connector";
import { configureForwarding } from "./forwarding";

export const sync = fn(
	z.object({ accountId: AccountIdSchema }),
	async ({ accountId }) => {
		const discovery = await State.discover(accountId);
		const { account, connection } = await connect(accountId);
		await Account.update({
			accountId,
			stateBucket: discovery.stateBucket,
			updatedAt: new Date().toISOString()
		});
		await configureForwarding({
			accountId,
			roleArn: account.roleArn,
			region: account.region,
			credentials: connection.credentials,
			bucket: discovery.stateBucket,
			busArn: process.env.SST_CONSOLE_BUS_ARN
		});
		const policy = await Connection.getSyncPolicy(accountId);
		const selected = discovery.states.filter(state =>
			Connection.Policy.includesStage(policy, state)
		);
		const conflicts: StageAccountConflict[] = [];
		for (const state of selected) {
			const result = await State.sync({
				accountId,
				appName: state.appName,
				stageName: state.stageName,
				policy
			});
			if (result.status === "missing")
				throw State.stateErrors.missingDiscovered();
			if (result.status === "conflict")
				conflicts.push(...result.conflicts);
		}
		// Only a complete discovery and successful required Stage syncs authorize cleanup.
		// TODO: Coordinate concurrent syncs and policy changes; define cleanup and monitoring failure outcomes.
		await State.cleanupStale({
			accountId,
			stages: selected.map(({ appName, stageName }) => ({
				appName,
				stageName
			}))
		});
		await Account.update({
			accountId,
			status: "connected",
			lastSyncConflicts: conflicts,
			updatedAt: new Date().toISOString()
		});
		return { ...discovery, skippedStages: conflicts };
	}
);
