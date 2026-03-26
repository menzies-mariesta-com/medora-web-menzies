import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCategory } from '$lib/remote/table/information-table/category.remote';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	// Currently this endpoint ignores request body.
	void request;
	return json(await getCategory());
};
