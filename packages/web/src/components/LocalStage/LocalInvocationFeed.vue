<template>
	<div class="local-invocation-feed column full-height">
		<div class="row items-center justify-between q-pa-sm">
			<div class="text-subtitle2">Invocations</div>
			<q-btn
				flat
				round
				dense
				icon="sym_r_delete_sweep"
				aria-label="Clear local invocations"
				@click="$emit('clear')"
			/>
		</div>
		<q-separator />
		<q-scroll-area class="local-invocation-feed__scroll">
			<q-list separator>
				<q-item
					v-for="invocation in invocations"
					:key="invocation.id"
					clickable
					:active="invocation.id === selectedId"
					active-class="bg-primary text-white"
					@click="$emit('select', invocation.id)"
				>
					<q-item-section avatar top>
						<q-icon :name="statusIcon(invocation.status)" />
					</q-item-section>
					<q-item-section>
						<q-item-label lines="1">{{
							sourceName(invocation)
						}}</q-item-label>
						<q-item-label
							caption
							:class="{
								'text-white': invocation.id === selectedId
							}"
						>
							{{ formatTime(invocation.start) }} ·
							{{ statusLabel(invocation) }}
						</q-item-label>
					</q-item-section>
				</q-item>
			</q-list>
			<div
				v-if="!invocations.length"
				class="q-pa-lg text-center text-secondary"
			>
				<q-icon name="sym_r_terminal" size="32px" class="q-mb-sm" />
				<div>Waiting for local invocations…</div>
			</div>
		</q-scroll-area>
	</div>
</template>

<script setup lang="ts">
import type { LocalInvocation } from "@/composables/local";

defineProps<{
	invocations: LocalInvocation[];
	selectedId?: string | undefined;
}>();
defineEmits<{ select: [id: string]; clear: [] }>();

function sourceName(invocation: LocalInvocation) {
	return invocation.source?.split("::").at(-1) ?? "Unknown function";
}

function statusIcon(status: LocalInvocation["status"]) {
	return {
		pending: "sym_r_more_horiz",
		success: "sym_r_check_circle",
		error: "sym_r_error"
	}[status];
}

function statusLabel(invocation: LocalInvocation) {
	if (invocation.status === "pending") return "Running";
	return invocation.duration === undefined
		? invocation.status === "success"
			? "Complete"
			: "Failed"
		: `${invocation.duration}ms`;
}

function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}
</script>

<style scoped lang="scss">
.local-invocation-feed {
	min-height: 0;
}

.local-invocation-feed__scroll {
	flex: 1;
	min-height: 0;
}
</style>
