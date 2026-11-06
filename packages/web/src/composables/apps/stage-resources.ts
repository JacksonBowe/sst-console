import type { ResourceTree } from "@sst-console/sdk";

const supportTypes = new Set([
	"sst:sst:LinkRef",
	"sst:sst:Linkable",
	"sst:sst:Secret",
	"sst:sst:DevCommand",
	"sst:sst:Version"
]);

export function isSupportResource(resource: ResourceTree): boolean {
	return supportTypes.has(resource.resourceType);
}

export function stageResourceCounts(resources: ResourceTree[]) {
	const entries = flattenResources(resources);
	return {
		resources: entries.filter(
			resource =>
				resource.resourceKind === "resource" ||
				isSupportResource(resource)
		).length,
		components: entries.filter(
			resource =>
				resource.resourceKind === "component" &&
				!isSupportResource(resource)
		).length
	};
}

export const stageResourceCategories = [
	{
		key: "functions",
		label: "Functions",
		icon: "sym_r_functions",
		resourceType: "sst.aws.Function"
	},
	{
		key: "dynamodb",
		label: "DynamoDB",
		icon: "sym_r_database",
		resourceType: "sst.aws.Dynamo"
	},
	{
		key: "s3",
		label: "S3",
		icon: "sym_r_folder_open",
		resourceType: "sst.aws.Bucket"
	},
	{
		key: "cognito",
		label: "Cognito",
		icon: "sym_r_manage_accounts",
		resourceType: "sst.aws.CognitoUserPool"
	}
] as const;

export type StageResourceCategory =
	(typeof stageResourceCategories)[number]["key"];

export function getStageResourceCategory(
	category: string | undefined
): (typeof stageResourceCategories)[number] | undefined {
	return stageResourceCategories.find(item => item.key === category);
}

export function stageResourceCategoriesFor(resources: ResourceTree[]) {
	const resourceTypes = new Set(
		flattenResources(resources).map(resource => resource.resourceType)
	);
	return stageResourceCategories.filter(category =>
		resourceTypes.has(category.resourceType)
	);
}

export function resourcesForStageCategory(
	resources: ResourceTree[],
	category: StageResourceCategory
): ResourceTree[] {
	const resourceCategory = getStageResourceCategory(category);
	if (!resourceCategory) return [];

	return resources.flatMap(resource => {
		const children = resourcesForStageCategory(resource.children, category);
		if (
			resource.resourceType !== resourceCategory.resourceType &&
			!children.length
		)
			return [];

		return [{ ...resource, children }];
	});
}

export function functionResourcesFor(
	resources: ResourceTree[]
): ResourceTree[] {
	return flattenResources(resources).filter(
		resource => resource.resourceType === "sst.aws.Function"
	);
}

function flattenResources(resources: ResourceTree[]): ResourceTree[] {
	return resources.flatMap(resource => [
		resource,
		...flattenResources(resource.children)
	]);
}
