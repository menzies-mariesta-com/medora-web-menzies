import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getServiceOrderDetailRowsForVisit } from '$lib/remote/table/information-table/service-order-detail.remote';

export const GET: RequestHandler = async ({ url }) => {
	const visitIdParam = url.searchParams.get('visitId');
	const visitId = visitIdParam ? Number(visitIdParam) : 0;

	if (!visitId || !Number.isFinite(visitId) || visitId <= 0) {
		return json(
			{ error: 'Invalid visitId', items: [] },
			{ status: 400 }
		);
	}

	const rows = await getServiceOrderDetailRowsForVisit({
		visitId
	});

	return json(
		{
			items: rows
		},
		{ status: 200 }
	);
};

