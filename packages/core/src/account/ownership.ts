export type StageAccountConflict = {
	appName: string;
	stageName: string;
	ownerAccountId: string;
};

export function partitionStageOwnership<
	T extends { appName: string; stageName: string }
>(
	accountId: string,
	stages: ReadonlyArray<
		readonly [T, { accountId: string } | null | undefined]
	>
): { conflicts: StageAccountConflict[]; projections: T[] } {
	const conflicts: StageAccountConflict[] = [];
	const projections = stages.flatMap(([projection, stage]) => {
		if (!stage || stage.accountId === accountId) return [projection];
		conflicts.push({
			appName: projection.appName,
			stageName: projection.stageName,
			ownerAccountId: stage.accountId
		});
		return [];
	});
	return { conflicts, projections };
}
