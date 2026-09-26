<template>
	<q-drawer
		:model-value="modelValue"
		:side="side"
		:show-if-above="showIfAbove"
		:bordered="bordered"
		:width="width"
		class="app-drawer"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<div class="app-drawer__inner">
			<div v-if="$slots.brand" class="app-drawer__brand q-pa-md">
				<!-- <div class="app-drawer__brand-accent rounded-borders q-mb-md" /> -->
				<slot name="brand" />
			</div>

			<div class="app-drawer__content q-pa-sm">
				<slot />
			</div>

			<div v-if="$slots.footer" class="app-drawer__footer q-pa-sm">
				<slot name="footer" />
			</div>
		</div>
	</q-drawer>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		modelValue: boolean;
		side?: "left" | "right";
		showIfAbove?: boolean;
		bordered?: boolean;
		width?: number;
	}>(),
	{
		side: "left",
		showIfAbove: true,
		bordered: true,
		width: 280
	}
);

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
}>();
</script>

<style lang="scss" scoped>
.app-drawer {
	background:
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--q-primary) 8%, transparent),
			transparent 180px
		),
		var(--q-page, white);
}

.app-drawer__inner {
	display: flex;
	min-height: 100%;
	flex-direction: column;
}

.app-drawer__brand-accent {
	height: 3px;
	background: linear-gradient(90deg, var(--q-primary), var(--q-accent));
}

.app-drawer__content {
	flex: 1 1 auto;
}

.app-drawer__footer {
	border-top: 1px solid rgb(0 0 0 / 8%);
}

.body--dark .app-drawer {
	background:
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--q-primary) 14%, transparent),
			transparent 180px
		),
		var(--q-dark);
}

.body--dark .app-drawer__footer {
	border-top-color: rgb(255 255 255 / 10%);
}
</style>
