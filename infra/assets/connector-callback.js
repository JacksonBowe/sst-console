exports.handler = async event => {
	let status = "SUCCESS";
	let reason = "SST Console connector callback completed";

	try {
		const payload = JSON.stringify({
			accountId: event.ResourceProperties.AccountId,
			region: event.ResourceProperties.Region,
			requestType: event.RequestType,
			roleArn: event.ResourceProperties.RoleArn
		});
		const result = await signedFetch(
			event.ResourceProperties.CallbackUrl,
			payload
		);
		if (!result.ok) {
			throw new Error(`Console callback returned ${result.status}`);
		}
	} catch (error) {
		if (event.RequestType === "Delete") {
			console.warn("Console delete callback failed", error);
		} else {
			status = "FAILED";
			reason =
				error instanceof Error
					? error.message
					: "Console callback failed";
		}
	}

	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId:
			event.PhysicalResourceId || event.ResourceProperties.AccountId,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		Data: {}
	});
	await fetch(event.ResponseURL, {
		method: "PUT",
		headers: {
			"content-type": "",
			"content-length": String(Buffer.byteLength(body))
		},
		body
	});
};

async function signedFetch(url, body) {
	const target = new URL(url);
	const region = /^([a-z]{2}(?:-gov)?-[a-z]+-\d+)\.on\.aws$/.exec(
		target.hostname.split("lambda-url.")[1] || ""
	)?.[1];
	if (!region) throw new Error("Unable to determine callback region");

	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const sessionToken = process.env.AWS_SESSION_TOKEN;
	if (!accessKeyId || !secretAccessKey || !sessionToken) {
		throw new Error("Lambda execution credentials are unavailable");
	}

	const { createHash, createHmac } = require("node:crypto");
	const hash = value => createHash("sha256").update(value).digest("hex");
	const hmac = (key, value) =>
		createHmac("sha256", key).update(value).digest();
	const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
	const date = now.slice(0, 8);
	const host = target.host;
	const contentType = "application/json";
	const payloadHash = hash(body);
	const headers = {
		"content-type": contentType,
		host: host,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date": now,
		"x-amz-security-token": sessionToken
	};
	const signedHeaders = Object.keys(headers).sort().join(";");
	const canonicalHeaders = Object.keys(headers)
		.sort()
		.map(key => `${key}:${headers[key].trim()}\n`)
		.join("");
	const canonicalRequest = [
		"POST",
		target.pathname || "/",
		target.search.slice(1),
		canonicalHeaders,
		signedHeaders,
		payloadHash
	].join("\n");
	const scope = `${date}/${region}/lambda/aws4_request`;
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		now,
		scope,
		hash(canonicalRequest)
	].join("\n");
	const dateKey = hmac(`AWS4${secretAccessKey}`, date);
	const regionKey = hmac(dateKey, region);
	const serviceKey = hmac(regionKey, "lambda");
	const signingKey = hmac(serviceKey, "aws4_request");
	const signature = createHmac("sha256", signingKey)
		.update(stringToSign)
		.digest("hex");

	headers.authorization =
		`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
		`SignedHeaders=${signedHeaders}, Signature=${signature}`;

	return fetch(target, { method: "POST", headers, body });
}
