<template>
	<q-card class="settings-dialog">
		<q-card-section
			class="row items-center justify-between q-px-lg q-py-md"
		>
			<div>
				<div class="text-h6 text-weight-bold">Settings</div>
				<div class="text-caption text-muted"
					>Customize your console experience</div
				>
			</div>
			<q-btn
				flat
				round
				dense
				icon="sym_r_close"
				aria-label="Close settings"
				v-close-popup
			/>
		</q-card-section>
		<q-separator />
		<div class="settings-dialog__body row no-wrap">
			<nav
				aria-label="Settings categories"
				class="settings-dialog__navigation q-pa-sm"
			>
				<AppDrawerItem
					:item="appearanceItem"
					:selected="tab === 'appearance'"
					:icon-only="$q.screen.lt.sm"
					aria-label="Appearance"
					aria-current="page"
					@click="tab = 'appearance'"
				/>
			</nav>
			<q-separator vertical />
			<q-tab-panels v-model="tab" class="col">
				<q-tab-panel name="appearance" class="q-pa-lg">
					<div
						class="row items-center justify-between q-col-gutter-sm q-pb-md"
					>
						<div class="col-12 col-sm">
							<div class="text-subtitle2">Color scheme</div>
							<div class="text-caption text-muted"
								>Choose a theme or follow your system</div
							>
						</div>
						<div class="col-12 col-sm-auto">
							<PillTabs
								:model-value="preference"
								:options="themeOptions"
								aria-label="Color scheme"
								@update:model-value="setTheme"
							/>
						</div>
					</div>
					<q-separator />
					<div
						class="row items-center justify-between q-col-gutter-sm q-py-md"
					>
						<div class="col-12 col-sm">
							<div class="text-subtitle2">Page style</div>
							<div class="text-caption text-muted">
								Choose how pages use available space
							</div>
						</div>
						<div class="col-12 col-sm-auto">
							<PillTabs
								:model-value="settings.contentWidth"
								:options="widthOptions"
								aria-label="Page style"
								@update:model-value="settings.setContentWidth"
							/>
						</div>
					</div>
				</q-tab-panel>
			</q-tab-panels>
		</div>
	</q-card>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { AppDrawerItem, type DrawerNavItem } from "@/components/ui/Drawer";
import { PillTabs, type PillTabOption } from "@/components/ui/PillTabs";
import { useTheme } from "@/composables/theme";
import { useUISettingsStore, type ColorScheme } from "@/stores/ui-settings";

const tab = ref("appearance");
const appearanceItem: DrawerNavItem = {
	label: "Appearance",
	icon: "sym_r_palette"
};
const themeOptions: PillTabOption<ColorScheme>[] = [
	{ label: "Dark", value: "dark" },
	{ label: "Light", value: "light" },
	{ label: "System", value: "system" }
];
const widthOptions: PillTabOption<"centered" | "full">[] = [
	{ label: "Centered", value: "centered" },
	{ label: "Full width", value: "full" }
];
const settings = useUISettingsStore();
const { preference, setTheme } = useTheme();
</script>

<style scoped>
.settings-dialog {
	width: 760px;
	max-width: 95vw;
}
.settings-dialog__body {
	min-height: 300px;
}
.settings-dialog__navigation {
	width: 180px;
	flex-shrink: 0;
}
@media (max-width: 599px) {
	.settings-dialog__navigation {
		width: 72px;
	}
}
</style>
