import {
	computed,
	reactive,
	shallowRef,
	type ComputedRef,
	type Ref
} from "vue";

function clone<T>(v: T): T {
	return JSON.parse(JSON.stringify(v));
}

function isEqual(a: unknown, b: unknown) {
	return JSON.stringify(a) === JSON.stringify(b);
}

function replaceReactive<T extends Record<string, unknown>>(target: T, src: T) {
	for (const k of Object.keys(target))
		if (!(k in src)) delete (target as Record<string, unknown>)[k];
	for (const [k, v] of Object.entries(src))
		(target as Record<string, unknown>)[k] = v;
}

function addedDiff<T extends Record<string, unknown>>(initial: T, current: T) {
	const result: Partial<T> = {};
	for (const key of Object.keys(current) as Array<keyof T>) {
		if (!(key in initial)) result[key] = current[key];
	}
	return result;
}

function updatedDiff<T extends Record<string, unknown>>(
	initial: T,
	current: T
) {
	const result: Partial<T> = {};
	for (const key of Object.keys(current) as Array<keyof T>) {
		if (key in initial && !isEqual(initial[key], current[key])) {
			result[key] = current[key];
		}
	}
	return result;
}

function objectDiff<T extends Record<string, unknown>>(initial: T, current: T) {
	return { ...addedDiff(initial, current), ...updatedDiff(initial, current) };
}

export interface UseFormResult<T extends Record<string, unknown>> {
	baseline: Ref<T>;
	form: T;
	reset: () => void;
	rebase: () => void;
	added: ComputedRef<Partial<T>>;
	updated: ComputedRef<Partial<T>>;
	diff: ComputedRef<Partial<T>>;
	dirty: ComputedRef<boolean>;
}

export function useForm<T extends Record<string, unknown>>(
	initial: T
): UseFormResult<T> {
	const baseline = shallowRef<T>(clone(initial)) as unknown as Ref<T>;
	const form = reactive<T>(clone(initial)) as T;

	// IMPORTANT: compare against the reactive `form` (no toRaw)
	const added = computed<Partial<T>>(() => addedDiff(baseline.value, form));
	const updated = computed<Partial<T>>(() =>
		updatedDiff(baseline.value, form)
	);
	const diff = computed<Partial<T>>(() => objectDiff(baseline.value, form));
	const dirty = computed<boolean>(() => Object.keys(diff.value).length > 0);

	const reset = () => replaceReactive(form, clone(baseline.value));
	const rebase = () => {
		baseline.value = clone(form);
	};

	return { baseline, form, reset, rebase, added, updated, diff, dirty };
}
