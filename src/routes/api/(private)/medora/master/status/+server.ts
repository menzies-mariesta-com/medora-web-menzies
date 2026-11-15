import { json, type RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { listStatusesCached } from '$lib/server/medora/master/status-list-cached.server';
import { privateJsonCacheHeaders } from '$lib/server/http/api-cache-headers.server';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	return json(await listStatusesCached(), {
		headers: privateJsonCacheHeaders(120, 600)
	});
}
