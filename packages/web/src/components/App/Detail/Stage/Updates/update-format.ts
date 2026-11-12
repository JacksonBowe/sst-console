import type { StateUpdate } from "@sst-console/sdk";
import { formatDateTime } from "@/components/ui/format";

export function status(update: StateUpdate, isNewest: boolean) {
	if (!update.processedAt) return "Unprocessed";
	if (!update.timeCompleted)
		return isNewest ? "Possibly in progress" : "Incomplete";
	if (!update.errors) return "Unknown";
	return update.errors.length || update.errorsTruncated
		? "Failed"
		: "Succeeded";
}

export function statusColor(update: StateUpdate, isNewest: boolean) {
	switch (status(update, isNewest)) {
		case "Succeeded":
			return "positive";
		case "Failed":
			return "negative";
		case "Possibly in progress":
			return "primary";
		case "Unprocessed":
			return "warning";
		default:
			return "grey";
	}
}

export function timestamp(value?: string) {
	return value && !Number.isNaN(Date.parse(value))
		? formatDateTime(value)
		: "Unavailable";
}

export function duration(start?: string, end?: string) {
	if (!start || !end) return "Duration unavailable";
	const seconds = (Date.parse(end) - Date.parse(start)) / 1000;
	return Number.isFinite(seconds) && seconds >= 0
		? `${seconds.toFixed(1)}s`
		: "Duration unavailable";
}

export function counts(update: StateUpdate) {
	const counts = update.resourceCounts;
	return counts
		? `Created ${counts.created} · Updated ${counts.updated} · Deleted ${counts.deleted} · Unchanged ${counts.unchanged}`
		: "Unavailable";
}
