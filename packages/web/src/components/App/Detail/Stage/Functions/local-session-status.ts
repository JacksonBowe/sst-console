import type { LocalConnectionStatus } from "@/composables/local";

export type LocalSessionStatusPresentation = {
	label: string;
	color: "positive" | "warning" | "negative";
	icon: string;
};

const presentations: Record<
	LocalConnectionStatus,
	LocalSessionStatusPresentation
> = {
	connecting: {
		label: "Connecting",
		color: "warning",
		icon: "sym_r_sync"
	},
	connected: {
		label: "Connected",
		color: "positive",
		icon: "sym_r_check_circle"
	},
	disconnected: {
		label: "Disconnected",
		color: "negative",
		icon: "sym_r_error"
	}
};

export function localSessionStatusPresentation(
	status: LocalConnectionStatus
): LocalSessionStatusPresentation {
	return presentations[status];
}
