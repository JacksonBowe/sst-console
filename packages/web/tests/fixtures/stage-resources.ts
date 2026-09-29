import type { ResourceTree } from "@sst-console/sdk";

function resource(
	resourceId: string,
	resourceType: string,
	children: ResourceTree[] = []
): ResourceTree {
	return {
		accountId: "123456789012",
		appName: "console",
		stageName: "dev",
		resourceId,
		resourceKind: "component",
		resourceType,
		urn: `urn:pulumi:dev::console::${resourceType}::${resourceId}`,
		arnIndex: `component#${resourceId}`,
		children,
		createdAt: "2026-09-29T00:00:00.000Z",
		updatedAt: "2026-09-29T00:00:00.000Z"
	};
}

export const stageResources = [
	resource("api", "sst.aws.Api", [resource("handler", "sst.aws.Function")]),
	resource("table", "sst.aws.Dynamo"),
	resource("uploads", "sst.aws.Bucket"),
	resource("users", "sst.aws.CognitoUserPool"),
	resource("realtime", "sst.aws.Realtime")
];
