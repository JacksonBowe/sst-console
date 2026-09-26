<template>
	<div>
		<slot name="trigger" :open="open">
			<q-btn
				no-caps
				:unelevated="unelevated"
				:label="label"
				:icon="icon"
				:color="color"
				:text-color="textColor"
				:ripple="false"
				:disable="disable"
				:loading="loading"
				:flat="flat"
				:round="round"
				:dense="dense"
				class="fit"
				@click.stop="open"
			/>
		</slot>
	</div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { useSlots, type Component } from "vue";

import DialogBase from "./DialogBase.vue";

const props = withDefaults(
	defineProps<{
		label?: string;
		icon?: string;
		color?: string;
		textColor?: string;
		disable?: boolean;
		loading?: boolean;
		flat?: boolean;
		dense?: boolean;
		unelevated?: boolean;
		nowrap?: boolean;
		round?: boolean;
	}>(),
	{
		color: "primary"
	}
);

const $q = useQuasar();
const slots = useSlots();

function open() {
	const slotContent = slots.default?.();
	const vnode = slotContent?.[0];

	if (!vnode) {
		console.warn("DialogTrigger: No content provided in default slot");
		return;
	}

	if (props.nowrap) {
		// <DialogTrigger nowrap><DialogForm><Content /></DialogForm></DialogTrigger>
		// Slot content is the dialog wrapper with nested content
		const children = vnode.children;
		const dialogChildren =
			children &&
			typeof children === "object" &&
			"default" in children &&
			typeof children.default === "function"
				? children.default()
				: undefined;
		const contentVnode = dialogChildren?.[0];

		$q.dialog({
			component: vnode.type as Component,
			componentProps: {
				...vnode.props,
				contentComponent: contentVnode?.type as Component,
				contentProps: contentVnode?.props ?? {}
			}
		});
	} else {
		// <DialogTrigger><Content /></DialogTrigger>
		// Wrap content in DialogBase
		$q.dialog({
			component: DialogBase,
			componentProps: {
				contentComponent: vnode.type as Component,
				contentProps: vnode.props ?? {}
			}
		});
	}
}
</script>
