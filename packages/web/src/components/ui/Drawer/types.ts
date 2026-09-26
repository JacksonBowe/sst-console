export type DrawerNavItem = {
	label: string;
	icon?: string;
	to?: string;
	exact?: boolean;
	disabled?: boolean;
	badge?: string | number;
	badgeColor?: string;
	children?: DrawerNavItem[];
};
