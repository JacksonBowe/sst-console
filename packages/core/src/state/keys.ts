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
	const match = /^update\/([^/]+)\/([^/]+)\/([^/]+)\.json$/.exec(key);
	if (!match) return;
	const [appName, stageName, updateId] = match.slice(1);
	if (!appName || !stageName || !updateId) return;
	return { appName, stageName, updateId, key };
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
