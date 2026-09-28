<template>
	<q-card flat bordered class="q-pa-xl">
		<div class="column items-center text-center q-gutter-sm">
			<q-icon name="sym_r_error" size="40px" color="negative" />
			<div class="text-h6">{{
				notFound ? "Stage no longer available" : "Unable to load Stage"
			}}</div>
			<div class="text-body2 text-secondary">
				{{
					notFound
						? "This Stage may have been removed by a later sync."
						: "Check your connection, then try again."
				}}
			</div>
			<div class="row q-gutter-sm">
				<q-btn
					v-if="!notFound"
					unelevated
					no-caps
					color="primary"
					label="Retry"
					@click="$emit('retry')"
				/>
				<q-btn
					flat
					no-caps
					color="primary"
					label="Return to Apps"
					:to="{ name: 'apps' }"
				/>
			</div>
		</div>
	</q-card>
</template>

<script setup lang="ts">
defineProps<{ notFound: boolean }>();
defineEmits<{ retry: [] }>();
</script>
