import { onBeforeUnmount, ref, toValue, type MaybeRefOrGetter } from "vue";

const COPIED_DURATION = 1_500;

export function useCopyValue(value: MaybeRefOrGetter<string>) {
	const copied = ref(false);
	let resetTimer: number | undefined;

	async function copy(): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(toValue(value));
			copied.value = true;
			resetCopiedState();
			return true;
		} catch {
			copied.value = false;
			return false;
		}
	}

	function resetCopiedState() {
		if (resetTimer !== undefined) window.clearTimeout(resetTimer);
		resetTimer = window.setTimeout(() => {
			copied.value = false;
			resetTimer = undefined;
		}, COPIED_DURATION);
	}

	onBeforeUnmount(() => {
		if (resetTimer !== undefined) window.clearTimeout(resetTimer);
	});

	return { copied, copy };
}
