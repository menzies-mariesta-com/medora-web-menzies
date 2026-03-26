import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersByRolePaginated } from '$lib/remote/table/auth-table/user.remote';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body: unknown = await request.json().catch(() => null);
	const params =
		body && typeof body === 'object' && 'params' in (body as any)
			? (body as any).params
			: body;

	return json(await getUsersByRolePaginated(params));
};
