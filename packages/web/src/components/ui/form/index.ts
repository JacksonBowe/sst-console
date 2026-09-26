export { SPasswordInput as PasswordInput } from "../Input";
export { useForm, type UseFormResult } from "./useForm";
export {
	useEntityForm,
	type EntityFormMode,
	type EntityFormOptions,
	type UseEntityFormResult
} from "./useEntityForm";
export { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";
import { date, is, patterns } from "quasar";

export const rules = {
	required: (msg?: string) => [
		(val: unknown) => Boolean(val) || msg || "Field required"
	],

	minLength: (min: number, msg?: string) => [
		(val: string | null | undefined) =>
			(!!val && val.length >= min) ||
			msg ||
			`Minimum ${min} characters required`
	],

	passwordPolicy: (
		policy: {
			minimumLength: number;
			requireLowercase: boolean;
			requireNumbers: boolean;
			requireSymbols: boolean;
			requireUppercase: boolean;
		},
		messages: {
			required: string;
			minimumLength: string;
			lowercase: string;
			number: string;
			symbol: string;
			uppercase: string;
		}
	) => {
		const minLengthMessage = messages.minimumLength.replace(
			"{minimumLength}",
			String(policy.minimumLength)
		);

		return [
			...rules.required(messages.required),
			...rules.minLength(policy.minimumLength, minLengthMessage),
			...(policy.requireLowercase
				? [(value: string) => /[a-z]/.test(value) || messages.lowercase]
				: []),
			...(policy.requireNumbers
				? [(value: string) => /[0-9]/.test(value) || messages.number]
				: []),
			...(policy.requireSymbols
				? [
						(value: string) =>
							/[^A-Za-z0-9]/.test(value) || messages.symbol
					]
				: []),
			...(policy.requireUppercase
				? [(value: string) => /[A-Z]/.test(value) || messages.uppercase]
				: [])
		];
	},

	maxLength: (max: number, msg?: string) => [
		(val: string | null | undefined) =>
			(!!val && val.length <= max) ||
			msg ||
			`Maximum ${max} characters allowed`
	],

	exactLength: (exact: number, msg?: string) => [
		(val: string | null | undefined) =>
			(!!val && val.length === exact) ||
			msg ||
			`Must be exactly ${exact} characters`
	],

	isEqualTo: (compareTo: string | number, message?: string) => [
		(val: string | number | null | undefined) =>
			val === compareTo ||
			(message ?? `Value must be equal to ${compareTo}`)
	],

	isEmail: (msg?: string) => [
		(val: string | null) =>
			(val !== null && val?.replace(/ /g, "").length > 0) ||
			msg ||
			"Email required",
		(val: string | null) =>
			patterns.testPattern.email(val) || msg || "Invalid email"
	],

	arrayMinLength: (min: number) => [
		(val: unknown[] | null | undefined) =>
			(!!val && val.length >= min) || `Select at least ${min} item(s)`
	],
	unique: (
		list: (string | number)[],
		message = "Value must be unique",
		caseInsensitive = true
	) => [
		(val: string | number | null | undefined) => {
			if (val === null || val === undefined) return true;
			const checkVal =
				typeof val === "string" && caseInsensitive
					? val.toLowerCase()
					: val;
			const listCheck = caseInsensitive
				? list.map(v => (typeof v === "string" ? v.toLowerCase() : v))
				: list;
			return !listCheck.includes(checkVal) || message;
		}
	],
	calendar: {
		disablePastDates: (candidateDate: string) => {
			const today = date.formatDate(new Date(), "YYYY/MM/DD");
			return candidateDate >= today;
		},
		disableFutureDates: (candidateDate: string) => {
			const today = date.formatDate(new Date(), "YYYY/MM/DD");
			return candidateDate <= today;
		}
	}
};

export function isFormModified<T extends object>(
	initial: Partial<Record<keyof T, unknown>> = {},
	current: T
): boolean {
	const relevantInitial = {} as Partial<T>;

	for (const key of Object.keys(current) as Array<keyof T>) {
		relevantInitial[key] = initial[key] as T[keyof T];
	}

	return !is.deepEqual(relevantInitial, current);
}
