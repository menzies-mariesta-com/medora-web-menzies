/** Client-safe pathname/query normalization for GET /api cache keys and route templates. */

const UUID_RE =
	/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Map runtime pathname → generated route template (`:id`, `:hospital_id`, `*`). */
export function pathnameToApiTemplate(pathname: string): string {
	let p = pathname.replace(/^\/api\/(?:private|public)\//, '/api/');
	p = p.replace(UUID_RE, '/:hospital_id');
	p = p.replace(/\/\d+/g, '/:id');
	return p;
}

/** Stable query string: keys and repeated values sorted, so `?a=1&b=2` === `?b=2&a=1`. */
export function sortedQuery(search: string): string {
	const params = new URLSearchParams(search);
	// `.keys()` yields one name per entry, so repeating names get deduped here.
	const keys = [...new Set(params.keys())].sort();
	const normalized = new URLSearchParams();
	for (const key of keys) {
		const values = params.getAll(key).sort();
		for (const v of values) normalized.append(key, v);
	}
	return normalized.toString();
}
