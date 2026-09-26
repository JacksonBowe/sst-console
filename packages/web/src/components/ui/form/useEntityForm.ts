import { computed, type ComputedRef } from "vue";
import { warningNotify } from "../toast";
import { useForm, type UseFormResult } from "./useForm";

export type EntityFormMode = "create" | "edit" | "read";

export interface EntityFormOptions<
	TForm extends Record<string, unknown>,
	TEntity,
	TCreateInput,
	TUpdateInput
> {
	/** Initial entity data (for edit/read modes) */
	initialValues?: Partial<TEntity> | undefined;
	/** Current form mode */
	mode: EntityFormMode;
	/** Convert entity to form data */
	toForm: (entity?: Partial<TEntity>) => TForm;
	/** Convert form data to create mutation input */
	toCreateInput: (form: TForm) => TCreateInput;
	/** Convert form data to update mutation input */
	toUpdateInput: (form: TForm) => TUpdateInput;
	/** Create mutation async function */
	createMutation: {
		mutateAsync: (input: TCreateInput) => Promise<unknown>;
		isPending: ComputedRef<boolean> | { value: boolean };
	};
	/** Update mutation async function */
	updateMutation: {
		mutateAsync: (input: TUpdateInput) => Promise<unknown>;
		isPending: ComputedRef<boolean> | { value: boolean };
	};
	/** Optional validation before submit (return error message or undefined) */
	validate?: () => string | undefined;
	/** Callback on successful submit */
	onSuccess?: () => void;
	/** Custom error message (default: 'An error occurred while submitting the form.') */
	errorMessage?: string;
}

export interface UseEntityFormResult<
	TForm extends Record<string, unknown>
> extends UseFormResult<TForm> {
	/** Combined pending state from create and update mutations */
	isPending: ComputedRef<boolean>;
	/** Submit handler for the form */
	onSubmit: () => Promise<void>;
}

/**
 * Composable for entity create/edit forms that handles common patterns:
 * - Form state management with dirty tracking
 * - Combined isPending from create/update mutations
 * - Mode-based submit logic (create vs edit)
 * - Error handling with warningNotify
 */
export function useEntityForm<
	TForm extends Record<string, unknown>,
	TEntity,
	TCreateInput,
	TUpdateInput
>(
	options: EntityFormOptions<TForm, TEntity, TCreateInput, TUpdateInput>
): UseEntityFormResult<TForm> {
	const {
		initialValues,
		mode,
		toForm,
		toCreateInput,
		toUpdateInput,
		createMutation,
		updateMutation,
		validate,
		onSuccess,
		errorMessage = "An error occurred while submitting the form."
	} = options;

	const formResult = useForm<TForm>(toForm(initialValues));

	const isPending = computed(
		() => createMutation.isPending.value || updateMutation.isPending.value
	);

	const onSubmit = async () => {
		// Run custom validation if provided
		if (validate) {
			const validationError = validate();
			if (validationError) {
				warningNotify(validationError);
				return;
			}
		}

		try {
			if (mode === "create") {
				await createMutation.mutateAsync(
					toCreateInput(formResult.form)
				);
			} else if (mode === "edit") {
				await updateMutation.mutateAsync(
					toUpdateInput(formResult.form)
				);
			}

			onSuccess?.();
		} catch (err) {
			console.error("Error submitting form:", err);
			warningNotify(errorMessage);
		}
	};

	return {
		...formResult,
		isPending,
		onSubmit
	};
}
