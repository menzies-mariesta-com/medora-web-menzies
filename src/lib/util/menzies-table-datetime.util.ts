/** Short en-US datetime for tables / EMR / charts. */
export function formatMenziesTableDateTime(
	value: Date | string | number | null | undefined,
	empty: string = '—'
): string {
	if (value == null || value === '') return empty;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return empty;
	return date.toLocaleString('en-US', {
		dateStyle: 'short',
		timeStyle: 'short'
	});
}
