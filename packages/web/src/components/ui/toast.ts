import { Notify } from "quasar";

export const successNotify = (message: string) => {
	Notify.create({
		message: message,
		color: "primary",
		icon: "sym_r_check"
	});
};

export const warningNotify = (message: string) => {
	Notify.create({
		message: message,
		color: "warning",
		icon: "sym_r_warning"
	});
};

export const errorNotify = (message: string) => {
	Notify.create({
		message: message,
		color: "negative",
		icon: "sym_r_error"
	});
};
