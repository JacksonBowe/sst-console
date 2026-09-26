<template>
	<div
		class="text-weight-bold row items-center"
		:class="$q.screen.lt.sm ? 'text-h6' : 'text-h5'"
	>
		<slot>{{ title }}</slot>
	</div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";

defineProps<{
	title?: string | undefined;
}>();

const $q = useQuasar();

// const router = useRouter();

// async function handleBack() {
// 	if (window.history.length > 2 || document.referrer) {
// 		router.back();
// 	} else {
// 		await router.push('/home');
// 	}
// }
</script>

<style scoped lang="scss">
.back-btn:hover {
	color: var(--q-primary);
}
</style>
