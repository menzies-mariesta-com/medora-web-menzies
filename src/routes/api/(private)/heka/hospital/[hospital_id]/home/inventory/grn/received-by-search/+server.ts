import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchGrnReceivedByUsers } from '$lib/server/heka/inventory/grn.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const q = event.url.searchParams.get('q') ?? '';
	const limit = Number(event.url.searchParams.get('limit') ?? '20');
	const rows = await searchGrnReceivedByUsers(event, { hospitalId, q, limit });
	return json(rows);
};

