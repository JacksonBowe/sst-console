/** Extracts currently supported Lambda error signals from one log message. */
export function parseError(message: string) {
	const normalizedSource = message.replace(/\r\n/g, "\n").trim();
	const lambdaError = lambdaErrorPrefix.test(normalizedSource);
	const normalized = normalizedSource.replace(lambdaErrorPrefix, "");
	if (!normalized) return;
	if (/Task timed out after/.test(normalized))
		return {
			errorType: "LambdaTimeoutError",
			errorMessage: normalized.slice(0, 16_384),
			stack: stackContext(normalized)
		};
	if (/Error: Runtime exited/.test(normalized))
		return {
			errorType: "LambdaRuntimeError",
			errorMessage: normalized.slice(0, 16_384),
			stack: stackContext(normalized)
		};
	if (lambdaError || /"level"\s*:\s*"ERROR"|\bERROR\b/.test(normalized))
		return {
			errorType: "ConsoleError",
			errorMessage: normalized.slice(0, 16_384),
			stack: stackContext(normalized)
		};
}

function stackContext(message: string) {
	const lines = message.split("\n");
	const stack = lines.filter(line => /^\s*at\s+/.test(line)).join("\n");
	return stack ? stack.slice(0, 8_192) : undefined;
}

/** Matches Lambda's per-invocation text error prefix. */
const lambdaErrorPrefix =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\t[^\t]+\tERROR\t/;
