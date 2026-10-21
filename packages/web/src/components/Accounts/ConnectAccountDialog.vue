<template>
	<q-card>
		<q-card-section class="row items-start no-wrap q-pb-sm">
			<q-icon
				name="sym_r_deployed_code"
				color="primary"
				size="32px"
				class="q-mr-md q-mt-xs"
			/>
			<div class="col">
				<div class="text-h6">Connect AWS account</div>
				<div class="text-body2 text-secondary q-mt-xs">
					Deploy a SSTConsoleConnection stack in your workload AWS
					account to connect it to this console.
				</div>
			</div>
			<q-btn
				flat
				round
				dense
				icon="sym_r_close"
				aria-label="Close connect AWS account dialog"
				v-close-popup
			/>
		</q-card-section>

		<q-card-section class="q-pt-sm q-gutter-md">
			<div class="q-gutter-y-md">
				<div
					v-for="(step, index) in steps"
					:key="step"
					class="row items-center q-gutter-sm text-body2"
				>
					<q-badge
						rounded
						color="primary"
						class="q-px-sm text-body2"
						>{{ index + 1 }}</q-badge
					>
					<span>{{ step }}</span>
				</div>
			</div>

			<q-banner rounded class="bg-primary-3 text-body2">
				<template #avatar
					><q-icon name="sym_r_info" color="primary"
				/></template>
				<div class="text-secondary">
					Creates an IAM role for SST Console, a registration Lambda,
					and EventBridge notifications for state updates.
				</div>
				<div class="text-weight-medium q-mt-sm text-warning">
					Security: The IAM role grants AdministratorAccess. Review
					the CloudFormation template before deployment.
				</div>
			</q-banner>

			<SInput
				:model-value="quickCreateUrl"
				label="CloudFormation setup link"
				readonly
				hide-bottom-space
			>
				<template #append>
					<q-btn
						flat
						dense
						round
						size="sm"
						:icon="copied ? 'sym_r_check' : 'sym_r_content_copy'"
						aria-label="Copy CloudFormation setup URL"
						@click="copy"
					/>
				</template>
			</SInput>
		</q-card-section>

		<q-card-actions align="right" class="q-px-md q-pb-md">
			<q-btn flat no-caps label="Cancel" v-close-popup />
			<q-btn
				unelevated
				no-caps
				color="primary"
				label="Open CloudFormation"
				icon-right="sym_r_open_in_new"
				:href="quickCreateUrl"
				target="_blank"
				rel="noopener noreferrer"
				v-close-popup
			/>
		</q-card-actions>
	</q-card>
</template>

<script setup lang="ts">
import { useCopyValue } from "@/components/ui/Identifier";
import { SInput } from "../ui/Input";

const props = defineProps<{ quickCreateUrl: string }>();

const steps = [
	"Sign in to your workload AWS account.",
	"Open the CloudFormation setup.",
	"Review permissions and create the stack."
];
const { copied, copy } = useCopyValue(() => props.quickCreateUrl);
</script>
