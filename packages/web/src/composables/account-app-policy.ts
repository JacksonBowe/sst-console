import type { AccountSyncPolicy, DiscoveredStage } from "@sst-console/sdk";
import { computed, ref, watch } from "vue";

export type ManagedAccountApp = {
	name: string;
	stages: DiscoveredStage[];
};

type PolicyGetter = () => AccountSyncPolicy | null;
type StagesGetter = () => DiscoveredStage[];

export function useAccountAppPolicy(
	stages: StagesGetter,
	policy: PolicyGetter,
	onUpdate: (policy: AccountSyncPolicy) => void
) {
	const onlySelected = ref(false);
	const pendingPolicyUpdate = ref<AccountSyncPolicy | null>(null);
	const apps = computed<ManagedAccountApp[]>(() => {
		const groups = new Map<string, DiscoveredStage[]>();
		for (const stage of stages()) {
			const entries = groups.get(stage.app) ?? [];
			entries.push(stage);
			groups.set(stage.app, entries);
		}
		return [...groups.entries()].map(([name, appStages]) => ({
			name,
			stages: appStages
		}));
	});
	const selectedStageCount = computed(
		() => stages().filter(stageIncluded).length
	);

	watch(
		policy,
		value => {
			if (value === pendingPolicyUpdate.value) {
				pendingPolicyUpdate.value = null;
				return;
			}
			pendingPolicyUpdate.value = null;
			onlySelected.value = (value?.allowList.length ?? 0) > 0;
		},
		{ immediate: true }
	);

	function stageIncluded(stage: DiscoveredStage) {
		const value = policy();
		if (!value) return false;
		const allowed =
			value.allowList.length === 0 ||
			value.allowList.some(selector => selectorMatches(selector, stage));
		const ignored = value.ignoreList.some(selector =>
			selectorMatches(selector, stage)
		);
		return allowed && !ignored;
	}

	function appIgnored(app: string) {
		return policy()?.ignoreList.some(
			selector => selector.app === app && selector.stage === undefined
		);
	}

	function appAllowanceCaption(app: ManagedAccountApp) {
		const included = app.stages.filter(stageIncluded).length;
		return included === app.stages.length
			? `Allowing all ${included} stages`
			: `Allowing ${included} of ${app.stages.length} stages`;
	}

	function appAllowanceVariant(app: ManagedAccountApp) {
		const included = app.stages.filter(stageIncluded).length;
		if (included === 0) return "muted";
		return included === app.stages.length ? "default" : "warning";
	}

	function setOnlySelected(value: boolean) {
		const currentPolicy = policy();
		if (!currentPolicy) return;
		onlySelected.value = value;
		if (!value) {
			updatePolicy({ ...currentPolicy, allowList: [] });
			return;
		}
		updatePolicy({
			...currentPolicy,
			allowList: stages()
				.filter(stageIncluded)
				.map(stage => ({ app: stage.app, stage: stage.stage }))
		});
	}

	function toggleApp(app: string) {
		const currentPolicy = policy();
		if (!currentPolicy) return;
		if (appIgnored(app)) {
			const nextPolicy = {
				...currentPolicy,
				ignoreList: currentPolicy.ignoreList.filter(
					selector =>
						!(selector.app === app && selector.stage === undefined)
				)
			};
			if (onlySelected.value)
				nextPolicy.allowList = [
					...nextPolicy.allowList,
					...(apps.value
						.find(entry => entry.name === app)
						?.stages.map(stage => ({
							app: stage.app,
							stage: stage.stage
						})) ?? [])
				];
			updatePolicy(nextPolicy);
			return;
		}
		updatePolicy({
			...currentPolicy,
			ignoreList: [...currentPolicy.ignoreList, { app }]
		});
	}

	function toggleStage(stage: DiscoveredStage, included: boolean) {
		const currentPolicy = policy();
		if (!currentPolicy) return;
		const exact = (selector: { app: string; stage?: string }) =>
			selector.app === stage.app && selector.stage === stage.stage;
		if (onlySelected.value) {
			updatePolicy({
				allowList: included
					? [
							...currentPolicy.allowList.filter(
								selector => !exact(selector)
							),
							{ app: stage.app, stage: stage.stage }
						]
					: currentPolicy.allowList.filter(
							selector => !exact(selector)
						),
				ignoreList: included
					? currentPolicy.ignoreList.filter(
							selector => !exact(selector)
						)
					: [
							...currentPolicy.ignoreList.filter(
								selector => !exact(selector)
							),
							{ app: stage.app, stage: stage.stage }
						]
			});
			return;
		}
		updatePolicy({
			...currentPolicy,
			ignoreList: included
				? currentPolicy.ignoreList.filter(selector => !exact(selector))
				: [
						...currentPolicy.ignoreList,
						{ app: stage.app, stage: stage.stage }
					]
		});
	}

	function updatePolicy(nextPolicy: AccountSyncPolicy) {
		pendingPolicyUpdate.value = nextPolicy;
		onUpdate(nextPolicy);
	}

	return {
		apps,
		onlySelected,
		selectedStageCount,
		stageIncluded,
		appIgnored,
		appAllowanceCaption,
		appAllowanceVariant,
		setOnlySelected,
		toggleApp,
		toggleStage
	};
}

function selectorMatches(
	selector: { app: string; stage?: string },
	stage: DiscoveredStage
) {
	return (
		matchesGlob(selector.app, stage.app) &&
		(selector.stage === undefined ||
			matchesGlob(selector.stage, stage.stage))
	);
}

function matchesGlob(pattern: string, value: string) {
	const pieces = pattern.split("*");
	let position = 0;
	for (const [index, piece] of pieces.entries()) {
		if (!piece) continue;
		const found = value.indexOf(piece, position);
		if (found === -1 || (index === 0 && found !== 0)) return false;
		position = found + piece.length;
	}
	return pattern.endsWith("*") || position === value.length;
}
