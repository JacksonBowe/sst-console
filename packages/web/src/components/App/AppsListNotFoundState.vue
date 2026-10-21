<template>
	<q-card flat bordered class="q-pa-xl">
		<div class="column items-center text-center q-gutter-sm">
			<q-icon name="sym_r_deployed_code" size="40px" color="secondary" />
			<div class="text-h6">No Apps discovered</div>
			<div class="text-body2 text-secondary">
				Connect and sync an AWS account to discover SST Apps and Stages.
			</div>
			<ConnectAccountTrigger />
		</div>
	</q-card>
</template>

<script setup lang="ts">
import { ConnectAccountTrigger } from "@/components/Accounts";
</script>
