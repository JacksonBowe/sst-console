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
