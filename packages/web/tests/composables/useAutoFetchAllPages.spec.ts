import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useAutoFetchAllPages } from "../../src/composables/useAutoFetchAllPages";

describe("useAutoFetchAllPages", () => {
	it("fetches available pages and stops on error", async () => {
		const hasNextPage = ref(false);
		const isFetching = ref(false);
		const isError = ref(false);
		const fetchNextPage = vi.fn().mockResolvedValue(undefined);
		const scope = effectScope();
		scope.run(() =>
			useAutoFetchAllPages({
				hasNextPage,
				isFetching,
				isError,
				fetchNextPage
			})
		);

		hasNextPage.value = true;
		await nextTick();
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
		isFetching.value = true;
		await nextTick();
		isError.value = true;
		isFetching.value = false;
		await nextTick();
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
		scope.stop();
	});
});
