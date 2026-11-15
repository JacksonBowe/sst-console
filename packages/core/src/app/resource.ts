import { db } from "../db";
import { chunkArray } from "../util/chunk";
import { StageKeySchema } from "./schema";
import { fn } from "../util/fn";
import { z } from "zod";
import { appErrors } from "./errors";

/** Removes Resource projections for one or more Stages. */
export const remove = fn(
	z.union([StageKeySchema, z.array(StageKeySchema)]),
	async input => {
		const stages = Array.isArray(input) ? input : [input];
		const results = await Promise.all(
			stages.map(input =>
				db.entities.resource.query.resource(input).go({ pages: "all" })
			)
		);
		await deleteResources(
			results.flatMap(result => result.data),
			Array.isArray(input)
		);
	}
);

async function deleteResources(
	resources: Array<{
		appName: string;
		stageName: string;
		resourceId: string;
	}>,
	accountCleanup: boolean
) {
	for (const chunk of chunkArray(resources, 90)) {
		const result = await db.transaction
			.write(({ resource }) =>
				chunk.map(item =>
					resource
						.delete({
							appName: item.appName,
							stageName: item.stageName,
							resourceId: item.resourceId
						})
						.commit()
				)
			)
			.go();
		if (result.canceled)
			throw accountCleanup
				? appErrors.accountProjectionRemovalFailed(
						"Unable to remove account resource projections"
					)
				: appErrors.resourceRemovalFailed();
	}
}
