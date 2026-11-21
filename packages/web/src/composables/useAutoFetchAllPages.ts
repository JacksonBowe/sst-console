import { watch, type Ref } from "vue";

/** Fetches remaining pages without retrying a failed page indefinitely. */
export function useAutoFetchAllPages(query: {
	hasNextPage: Ref<boolean>;
	isFetching: Ref<boolean>;
	isError: Ref<boolean>;
	fetchNextPage: () => Promise<unknown>;
}) {
	watch(
		[query.hasNextPage, query.isFetching, query.isError],
		([hasNextPage, isFetching, isError]) => {
			if (hasNextPage && !isFetching && !isError)
				void query.fetchNextPage();
		},
		{ immediate: true }
	);
}
