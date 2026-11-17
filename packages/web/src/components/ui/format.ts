/**
 * Format a date to a localized date string.
 * @param date - Date object or ISO string
 * @param locale - Optional locale (e.g., 'en-AU'). Defaults to browser locale.
 */
export function formatDate(
	date: Date | string,
	locale?: string,
	options?: Intl.DateTimeFormatOptions
): string {
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleDateString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",

		...options
	});
}

/**
 * Format a date to a localized date and time string.
 * @param date - Date object or ISO string
 * @param locale - Optional locale (e.g., 'en-AU'). Defaults to browser locale.
 */
export function formatDateTime(date: Date | string, locale?: string): string {
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleString(locale);
}

export const relativeTime = (timestamp: string): string => {
	const time = new Date(timestamp).getTime();
	if (Number.isNaN(time)) return "Invalid date";
	const elapsed = Math.max(0, Date.now() - time);
	if (elapsed < 60_000) return "just now";
	const units = [
		["year", 31_536_000_000],
		["month", 2_592_000_000],
		["day", 86_400_000],
		["hour", 3_600_000],
		["minute", 60_000]
	] as const;
	const [unit, duration] = units.find(([, duration]) => elapsed >= duration)!;
	const count = Math.floor(elapsed / duration);
	return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
};
