import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSummary } from '$lib/server/medora/admin/admin-summary.server';

export const GET: RequestHandler = async (event) => {
	const summary = await getAdminSummary(event);
	return json(summary);
};
