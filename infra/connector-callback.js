exports.handler = async event => {
	let status = "SUCCESS";
	let reason = "SST Console connector callback completed";

	try {
		const result = await fetch(event.ResourceProperties.CallbackUrl, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				accountId: event.ResourceProperties.AccountId,
				region: event.ResourceProperties.Region,
				requestType: event.RequestType,
				roleArn: event.ResourceProperties.RoleArn
			})
		});
		if (!result.ok) {
			throw new Error(`Console callback returned ${result.status}`);
		}
	} catch (error) {
		status = "FAILED";
		reason =
			error instanceof Error ? error.message : "Console callback failed";
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
