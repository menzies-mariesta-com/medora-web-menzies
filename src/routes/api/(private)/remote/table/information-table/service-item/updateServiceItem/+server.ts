import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateServiceItem } from '$lib/remote/table/information-table/service-item.remote';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body: unknown = await request.json().catch(() => null);
	const payload =
		body && typeof body === 'object' && 'payload' in (body as any)
			? (body as any).payload
			: body;

	if (!payload || typeof payload !== 'object' || !('id' in payload)) {
		throw error(400, 'Expected payload with `id`');
	}

	const result = await updateServiceItem(payload as any);
	return json(result);
};
