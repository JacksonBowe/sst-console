const sensitiveKeys = new Set([
	"authorization",
	"apikey",
	"xapikey",
	"token",
	"accesstoken",
	"refreshtoken",
	"idtoken",
	"secret",
	"secretkey",
	"password",
	"cookie",
	"accesskeyid",
	"awsaccesskeyid",
	"secretaccesskey",
	"awssecretaccesskey",
	"sessiontoken",
	"awssessiontoken",
	"awssecuritytoken"
]);

export function redactSensitiveData(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSensitiveData);
	if (!isRecord(value)) return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => [
			key,
			isSensitiveKey(key)
				? redactSecret(child)
				: redactSensitiveData(child)
		])
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isSensitiveKey(key: string): boolean {
	return sensitiveKeys.has(key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase());
}

function redactSecret(value: unknown): string {
	if (typeof value !== "string") return "••••••••";

	const bearer = value.match(/^(Bearer\s+)(.+)$/i);
	if (bearer)
		return `${bearer[1] ?? "Bearer "}${partiallyRedact(bearer[2] ?? "")}`;

	return partiallyRedact(value);
}

function partiallyRedact(value: string): string {
	if (value.length <= 8) return "••••••••";
	return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
