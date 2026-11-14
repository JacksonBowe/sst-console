export interface PillTabOption<T extends string | number> {
	value: T;
	label: string;
	icon?: string;
	count?: number | null;
	tooltip?: string;
	disabled?: boolean;
}
