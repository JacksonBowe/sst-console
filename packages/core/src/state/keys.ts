/** Parses a current SST State object key. */
export function parseStateKey(
	key: string
): { appName: string; stageName: string; key: string } | undefined {
	const match = /^app\/([^/]+)\/(.+)\.json$/.exec(key);
	if (!match) return;
	return { appName: match[1]!, stageName: match[2]!, key };
}

/** Constructs the S3 key for a Stage's current State. */
export function stateObjectKey(appName: string, stageName: string): string {
	return `app/${appName}/${stageName}.json`;
}

/** Parses exactly one SST Update artifact key. */
export function parseUpdateKey(
	key: string
):
	| { appName: string; stageName: string; updateId: string; key: string }
	| undefined {
	const artifact = parseArtifactKey(key);
	if (artifact?.kind !== "update") return;
	const { appName, stageName, updateId } = artifact;
	return { appName, stageName, updateId, key };
}

/** Parses an Update, Snapshot, or Event Log artifact key. */
export function parseArtifactKey(key: string) {
	const match =
		/^(update|snapshot|eventlog)\/([^/]+)\/([^/]+)\/([^/]+)\.json$/.exec(
			key
		);
	if (!match) return;
	return {
		kind: match[1] as "update" | "snapshot" | "eventlog",
		appName: match[2]!,
		stageName: match[3]!,
		updateId: match[4]!,
		key
	};
}

/** Constructs the S3 key for an SST Update artifact. */
export function updateObjectKey(
	appName: string,
	stageName: string,
	updateId: string
): string {
	return `update/${appName}/${stageName}/${updateId}.json`;
}

// TODO: Does this need to be here is should it live in a shared helper? We define this in several places over the app
/** Creates an in-memory key for a Stage identity. */
export function stageKey(appName: string, stageName: string): string {
	return `${appName}\u0000${stageName}`;
}
