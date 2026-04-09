import { json, type RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { listStatuses } from '$lib/server/heka/master/status-list.server';

export async function GET(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	return json(await listStatuses());
}
