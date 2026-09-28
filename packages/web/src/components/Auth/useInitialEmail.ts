import { ref, watch } from "vue";

export function useInitialEmail(initialEmail: () => string | undefined) {
	const email = ref(initialEmail() ?? "");

	watch(initialEmail, value => {
		if (value !== undefined) {
			email.value = value;
		}
	});

	return email;
}
