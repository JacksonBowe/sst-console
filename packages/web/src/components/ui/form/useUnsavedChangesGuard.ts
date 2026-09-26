import { useQuasar } from "quasar";
import type { ComputedRef, Ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

export interface UseUnsavedChangesGuardOptions {
	/** Dialog title (default: 'Unsaved Changes') */
	title?: string;
	/** Dialog message (default: 'You have unsaved changes. Are you sure you want to discard them?') */
	message?: string;
	/** Cancel button label (default: 'Keep Editing') */
	cancelLabel?: string;
	/** OK button label (default: 'Discard') */
	okLabel?: string;
}

/**
 * Composable that guards against losing unsaved changes.
 *
 * - Intercepts Vue Router navigation when dirty
 * - Provides `confirmDiscard()` for programmatic confirmation (e.g., Cancel button)
 *
 * @param dirty - A ref or computed that indicates if there are unsaved changes
 * @param options - Optional dialog customization
 */
export function useUnsavedChangesGuard(
	dirty: Ref<boolean> | ComputedRef<boolean>,
	options: UseUnsavedChangesGuardOptions = {}
) {
	const $q = useQuasar();

	const {
		title = "Unsaved Changes",
		message = "You have unsaved changes. Are you sure you want to discard them?",
		cancelLabel = "Keep Editing",
		okLabel = "Discard"
	} = options;

	/**
	 * Shows a confirmation dialog if dirty, resolves to true if user confirms discard.
	 * If not dirty, resolves to true immediately.
	 */
	function confirmDiscard(): Promise<boolean> {
		return new Promise(resolve => {
			if (!dirty.value) {
				resolve(true);
				return;
			}

			$q.dialog({
				title,
				message,
				cancel: { label: cancelLabel, flat: true, noCaps: true },
				ok: {
					label: okLabel,
					color: "negative",
					flat: true,
					noCaps: true
				},
				persistent: true
			})
				.onOk(() => resolve(true))
				.onCancel(() => resolve(false));
		});
	}

	// Intercept Vue Router navigation
	onBeforeRouteLeave(async () => {
		if (!dirty.value) return true;
		return confirmDiscard();
	});

	return { confirmDiscard };
}
