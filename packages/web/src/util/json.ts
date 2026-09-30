export function parseJsonBody(value: unknown): unknown {
	if (!isRecord(value)) return value;

	if (typeof value.body === "string") {
		const body = tryParseJson(value.body);
		return body.parsed ? { ...value, body: body.value } : value;
	}

	if (!isRecord(value.response) || typeof value.response.body !== "string")
		return value;

	const body = tryParseJson(value.response.body);
	if (!body.parsed) return value;

	return {
		...value,
		response: { ...value.response, body: body.value }
	};
}

function tryParseJson(
	value: string
): { parsed: true; value: unknown } | { parsed: false } {
	try {
		return { parsed: true, value: JSON.parse(value) };
	} catch {
		return { parsed: false };
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
