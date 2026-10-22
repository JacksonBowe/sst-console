const partiallyRedactedKeys = new Set([
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

const fullyRedactedKeys = new Set([
	"xforwardedfor",
	"sourceip",
	"forwarded",
	"xrealip",
	"trueclientip",
	"cfconnectingip"
]);

export function redactSensitiveData(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSensitiveData);
	if (!isRecord(value)) return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => [
			key,
			redactValue(key, child)
		])
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function redactValue(key: string, value: unknown): unknown {
	const normalizedKey = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
	if (fullyRedactedKeys.has(normalizedKey)) return "••••••••";
	if (partiallyRedactedKeys.has(normalizedKey))
		return partiallyRedactValue(value);
	return redactSensitiveData(value);
}

function partiallyRedactValue(value: unknown): string {
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
