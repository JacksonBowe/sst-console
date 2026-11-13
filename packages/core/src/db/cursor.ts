import { Buffer } from "node:buffer";
import { z } from "zod";

/** ElectroDB encodes its DynamoDB continuation key as Base64URL JSON. */
export const CursorSchema = z
	.string()
	.min(1)
	.refine(cursor => {
		if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return false;
		try {
			const bytes = Buffer.from(cursor, "base64url");
			if (bytes.toString("base64url") !== cursor) return false;
			const key: unknown = JSON.parse(bytes.toString("utf8"));
			if (!key || typeof key !== "object" || Array.isArray(key))
				return false;
			const entries = Object.entries(key);
			return (
				entries.length > 0 &&
				entries.every(
					([name, value]) =>
						name.length > 0 &&
						((typeof value === "string" && value.length > 0) ||
							(typeof value === "number" &&
								Number.isFinite(value)))
				)
			);
		} catch {
			return false;
		}
	}, "Invalid cursor format");
