import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminOps } from '$lib/server/medora/admin/admin-ops.server';

export const GET: RequestHandler = async (event) => {
	const ops = await getAdminOps(event);
	return json(ops);
};
