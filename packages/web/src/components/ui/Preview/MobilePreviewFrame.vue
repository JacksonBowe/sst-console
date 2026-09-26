<template>
	<q-card flat bordered class="mobile-preview-frame column no-wrap">
		<q-card-section class="q-py-sm">
			<div class="row items-center no-wrap">
				<div>
					<div class="text-subtitle2 text-weight-bold">{{
						title
					}}</div>
					<div v-if="subtitle" class="text-caption text-grey-7">{{
						subtitle
					}}</div>
				</div>

				<q-space />
				<slot name="actions" />
			</div>
		</q-card-section>

		<q-separator />

		<div class="col mobile-preview-frame__body">
			<q-scroll-area class="fit">
				<div class="q-pa-sm">
					<slot />
				</div>
			</q-scroll-area>
		</div>
	</q-card>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		title?: string;
		subtitle?: string;
	}>(),
	{
		title: "Preview",
		subtitle: ""
	}
);
</script>

<style scoped lang="scss">
.mobile-preview-frame {
	height: 100%;
	min-height: 0;
	border-radius: 28px;
	background: var(--q-page, white);
	box-shadow: 0 18px 60px rgb(0 0 0 / 14%);
}

.mobile-preview-frame__body {
	min-height: 0;
}
</style>
