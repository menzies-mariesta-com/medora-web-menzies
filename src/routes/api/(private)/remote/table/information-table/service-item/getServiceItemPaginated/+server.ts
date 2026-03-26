import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceItemPaginated } from '$lib/remote/table/information-table/service-item.remote';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body: unknown = await request.json().catch(() => null);
	const params =
		body && typeof body === 'object' && 'params' in (body as any)
			? (body as any).params
			: body;

	return json(await getServiceItemPaginated(params));
};
