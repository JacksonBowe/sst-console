export { default as BaseTable } from "./BaseTable.vue";
export { default as TableClearFilters } from "./TableClearFilters.vue";
export { default as TableFilter } from "./TableFilter.vue";
export { default as TableSearch } from "./TableSearch.vue";
export { default as TableToolbar } from "./TableToolbar.vue";
export { default as TableViewOptions } from "./TableViewOptions.vue";
export { default as CellDate } from "./CellDate.vue";

import { type QTableColumn } from "quasar";

export type ExtendedQTableColumn = QTableColumn & {
	hidden?: boolean;
};

export interface Filters {
	text: string; // Search term
	facets: Record<string, string[] | null>; // Facets as dynamic keys with selected values
}

export const hasActiveFilters = (
	filters?: Filters,
	options?: { facetsOnly?: boolean }
): boolean => {
	if (!filters) return false;
	const { facetsOnly = false } = options ?? {};

	// Check text (unless facetsOnly)
	if (!facetsOnly && filters.text.trim() !== "") return true;

	// Check all facets
	for (const key in filters.facets) {
		const val = filters.facets[key];
		if (Array.isArray(val) && val.length > 0) return true;
	}

	return false;
};

// Adjusted filter function
export const useCustomFilter = <RowType>(
	rows: readonly RowType[] = [],
	terms: Filters,
	cols: readonly {
		name: string;
		field: keyof RowType | ((row: RowType) => unknown);
	}[] = [],
	getCellValue: (
		col: {
			name: string;
			field: keyof RowType | ((row: RowType) => unknown);
		},
		row: RowType
	) => unknown
): RowType[] => {
	let filteredRows = [...rows]; // Copy rows to keep immutability

	// Facet filtering
	for (const facet in terms.facets) {
		const selectedValues = terms.facets[facet];
		if (!selectedValues?.length) continue;

		const col = cols.find(c => c.name === facet);
		if (!col) {
			// Column not in visible columns - fall back to direct row property access
			// This allows filtering on hidden columns
			filteredRows = filteredRows.filter(row => {
				const value = (row as Record<string, unknown>)[facet];
				if (value == null) return false;
				// Only match primitives for hidden column filtering
				switch (typeof value) {
					case "string":
					case "number":
					case "boolean":
					case "bigint":
						return selectedValues.includes(String(value));
					default:
						return false;
				}
			});
			continue;
		}

		filteredRows = filteredRows.filter(row => {
			const value = getCellValue(col, row);

			if (value == null) return false; // null/undefined never match

			if (Array.isArray(value)) {
				// any element matches one of the selected values
				return value.some(v => selectedValues.includes(String(v)));
			}

			if (typeof value === "object") {
				// object match by stable JSON (same strategy you already used)
				return selectedValues.includes(JSON.stringify(value));
			}

			// primitives only (prevents "[object Object]" cases)
			switch (typeof value) {
				case "string":
				case "number":
				case "boolean":
				case "bigint":
					return selectedValues.includes(String(value));
				default:
					return false; // ignore symbol/function etc.
			}
		});
	}

	// Text search filtering
	const searchTerm = (terms.text ?? "").trim().toLowerCase();
	if (!searchTerm) return filteredRows;

	return filteredRows.filter(row =>
		cols.some(col => {
			const value = getCellValue(col, row);

			if (value == null) return false; // null or undefined

			if (Array.isArray(value)) {
				return value.some(val =>
					String(val ?? "")
						.toLowerCase()
						.includes(searchTerm)
				);
			}

			if (typeof value === "object") {
				return JSON.stringify(value).toLowerCase().includes(searchTerm);
			}

			// Here value is: string | number | boolean | bigint | symbol | function
			// Usually you only want primitives:
			switch (typeof value) {
				case "string":
				case "number":
				case "boolean":
				case "bigint":
					return String(value).toLowerCase().includes(searchTerm);
				default:
					return false; // ignore symbol/function, etc.
			}
		})
	);
};
