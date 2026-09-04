/** Display datetime in MariTable cells (matches EMR table style). */
export function formatMariTableDateTime(
	value: Date | string | number | null | undefined
): string {
	if (value == null || value === '') return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString('en-US', {
		dateStyle: 'short',
		timeStyle: 'short'
	});
}
