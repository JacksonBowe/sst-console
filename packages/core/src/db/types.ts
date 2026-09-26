export type Page<T> = {
	items: T[];
	meta: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
};
