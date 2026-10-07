import { z } from "zod";

import { InputError } from "../error";

const selectorPart = z
	.string()
	.min(1)
	.max(255)
	.refine(value => !value.includes("/") && !value.includes("\u0000"), {
		message: "Selector values cannot contain a slash or null character"
	})
	.refine(value => !value.includes("**"), {
		message: "Selectors support only single-star globs"
	});

export const StageSelectorSchema = z.object({
	app: selectorPart,
	stage: selectorPart.optional()
});

export const AccountSyncPolicySchema = z.object({
	allowList: z.array(StageSelectorSchema).max(200),
	ignoreList: z.array(StageSelectorSchema).max(200)
});

export type StageSelector = z.infer<typeof StageSelectorSchema>;
export type AccountSyncPolicy = z.infer<typeof AccountSyncPolicySchema>;

export const defaultSyncPolicy = (): AccountSyncPolicy => ({
	allowList: [],
	ignoreList: []
});

export function parseSyncPolicy(value: unknown): AccountSyncPolicy {
	if (value === undefined) return defaultSyncPolicy();
	const parsed = AccountSyncPolicySchema.safeParse(value);
	if (!parsed.success)
		throw new InputError(
			"invalid_sync_policy",
			"Account sync policy is invalid"
		);
	return parsed.data;
}

export function matchesStageSelector(
	selector: StageSelector,
	stage: { appName: string; stageName: string }
): boolean {
	return (
		matches(selector.app, stage.appName) &&
		(selector.stage === undefined ||
			matches(selector.stage, stage.stageName))
	);
}

export function includesStage(
	policy: AccountSyncPolicy,
	stage: { appName: string; stageName: string }
): boolean {
	const allowed =
		policy.allowList.length === 0 ||
		policy.allowList.some(selector =>
			matchesStageSelector(selector, stage)
		);
	return (
		allowed &&
		!policy.ignoreList.some(selector =>
			matchesStageSelector(selector, stage)
		)
	);
}

function matches(pattern: string, value: string): boolean {
	const pieces = pattern.split("*");
	let position = 0;
	for (const [index, piece] of pieces.entries()) {
		if (!piece) continue;
		const found = value.indexOf(piece, position);
		if (found === -1 || (index === 0 && found !== 0)) return false;
		position = found + piece.length;
	}
	return !pattern.endsWith("*") ? position === value.length : true;
}
