import { error, json, type RequestEvent } from '@sveltejs/kit';
import { getMasterLookupListCached } from '$lib/server/medora/master/lookup-lists-cached.server';
import { privateJsonCacheHeaders } from '$lib/server/http/api-cache-headers.server';

const KINDS = new Set([
	'gender',
	'maritalStatus',
	'title',
	'identityType',
	'bloodType',
	'country',
	'state',
	'city',
	'postalCode',
	'nationality',
	'religion',
	'severity'
]);

export async function GET(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const kind = event.url.searchParams.get('kind') ?? '';
	if (!KINDS.has(kind)) throw error(400, 'Unknown or missing kind');

	const rows = await getMasterLookupListCached(kind);
	return json(rows, {
		headers: privateJsonCacheHeaders(120, 600)
	});
}
