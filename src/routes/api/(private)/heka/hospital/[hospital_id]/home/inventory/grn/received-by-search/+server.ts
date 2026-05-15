import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	lookupGrnReceivedByUserForHospital,
	searchGrnReceivedByUsers
} from '$lib/server/heka/inventory/grn.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const userId = event.url.searchParams.get('userId')?.trim();
	if (userId) {
		const row = await lookupGrnReceivedByUserForHospital(event, {
			hospitalId,
			userId
		});
		return json(row ? [row] : []);
	}
	const q = event.url.searchParams.get('q') ?? '';
	const limit = Number(event.url.searchParams.get('limit') ?? '20');
	const rows = await searchGrnReceivedByUsers(event, {
		hospitalId,
		q,
		limit
	});
	return json(rows);
};
