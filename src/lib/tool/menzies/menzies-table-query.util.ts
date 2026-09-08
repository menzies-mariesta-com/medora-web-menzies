/** Parse `filter_<columnId>` query params from a URLSearchParams object. */
export function parseMenziesTableColumnFilters(
	sp: URLSearchParams
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of sp.entries()) {
		if (!key.startsWith('filter_')) continue;
		const columnId = key.slice('filter_'.length);
		if (!columnId) continue;
		const trimmed = value.trim();
		if (trimmed) out[columnId] = trimmed;
	}
	return out;
}

/** Append MenziesTable column filters as `filter_<columnId>` query params. */
export function appendMenziesTableColumnFilters(
	sp: URLSearchParams,
	filters: Record<string, string>
): void {
	for (const [columnId, value] of Object.entries(filters)) {
		const trimmed = value.trim();
		if (trimmed) sp.set(`filter_${columnId}`, trimmed);
	}
}
