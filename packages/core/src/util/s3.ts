/** Identifies the S3 missing-object responses handled by State ingestion. */
export function isMissingObject(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const awsError = error as {
		name?: unknown;
		$metadata?: { httpStatusCode?: unknown };
	};
	return (
		awsError.name === "NoSuchKey" ||
		awsError.name === "NotFound" ||
		awsError.$metadata?.httpStatusCode === 404
	);
}
