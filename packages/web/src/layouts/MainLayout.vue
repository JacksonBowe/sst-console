<template>
	<q-layout view="lHh Lpr lFf">
		<q-header elevated>
			<q-toolbar>
				<q-btn
					flat
					dense
					round
					icon="sym_r_menu"
					aria-label="Menu"
					@click="toggleLeftDrawer"
				/>

				<q-toolbar-title> Quasar App </q-toolbar-title>

				<div>Quasar v{{ $q.version }}</div>
			</q-toolbar>
		</q-header>

		<q-drawer v-model="leftDrawerOpen" show-if-above bordered>
			<q-list>
				<q-item-label header> Essential Links </q-item-label>

				<EssentialLink
					v-for="link in linksList"
					:key="link.label"
					v-bind="link"
				/>
			</q-list>
		</q-drawer>

		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import EssentialLink, {
	type EssentialLinkProps
} from "@/components/EssentialLink.vue";

const linksList: EssentialLinkProps[] = [
	{
		label: "Docs",
		caption: "quasar.dev",
		icon: "sym_r_school",
		link: "https://quasar.dev"
	},
	{
		label: "GitHub",
		caption: "github.com/quasarframework",
		icon: "sym_r_code",
		link: "https://github.com/quasarframework"
	},
	{
		label: "Discord Chat Channel",
		caption: "chat.quasar.dev",
		icon: "sym_r_chat",
		link: "https://chat.quasar.dev"
	},
	{
		label: "Forum",
		caption: "forum.quasar.dev",
		icon: "sym_r_record_voice_over",
		link: "https://forum.quasar.dev"
	},
	{
		label: "Twitter",
		caption: "@quasarframework",
		icon: "sym_r_rss_feed",
		link: "https://twitter.quasar.dev"
	},
	{
		label: "Facebook",
		caption: "@QuasarFramework",
		icon: "sym_r_public",
		link: "https://facebook.quasar.dev"
	},
	{
		label: "Quasar Awesome",
		caption: "Community Quasar projects",
		icon: "sym_r_favorite",
		link: "https://awesome.quasar.dev"
	}
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
	leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
