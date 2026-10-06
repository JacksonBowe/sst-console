/** Extracts currently supported Lambda error signals from one log message. */
export function parseError(message: string) {
	const normalizedSource = message.replace(/\r\n/g, "\n").trim();
	const lambdaError = lambdaErrorPrefix.test(normalizedSource);
	const normalized = normalizedSource.replace(lambdaErrorPrefix, "");
	if (!normalized) return;
	if (/Task timed out after/.test(normalized))
		return {
			error: "LambdaTimeoutError",
			message: normalized.slice(0, 16_384)
		};
	if (/Error: Runtime exited/.test(normalized))
		return {
			error: "LambdaRuntimeError",
			message: normalized.slice(0, 16_384)
		};
	if (lambdaError || /"level"\s*:\s*"ERROR"|\bERROR\b/.test(normalized))
		return { error: "ConsoleError", message: normalized.slice(0, 16_384) };
}

/** Matches Lambda's per-invocation text error prefix. */
const lambdaErrorPrefix =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\t[^\t]+\tERROR\t/;
