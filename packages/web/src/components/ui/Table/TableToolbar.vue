<template>
	<div class="column q-gutter-y-sm">
		<!-- Row 1: Search (full width on mobile, inline with filters on desktop) -->
		<div class="row items-center q-gutter-sm">
			<slot name="search" />
			<!-- Desktop: filters & actions inline with search -->
			<template v-if="$q.screen.gt.xs">
				<slot name="filters" />
				<q-space />
				<slot name="actions" />
			</template>
		</div>

		<!-- Row 2: Mobile only - Filters & Actions on second row -->
		<div v-if="$q.screen.lt.sm" class="row items-center q-gutter-sm">
			<slot name="filters" />
			<q-space />
			<slot name="actions" />
		</div>
	</div>
</template>

<script setup lang="ts">
// Responsive table toolbar component
// - Desktop (>599px): Search + Filters + Actions in one row
// - Mobile (≤599px): Search on first row, Filters + Actions on second row
</script>
