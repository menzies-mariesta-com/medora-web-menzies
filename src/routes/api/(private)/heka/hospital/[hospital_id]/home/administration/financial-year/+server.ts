import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createFinancialYear,
	deleteFinancialYear,
	getFinancialYearsByHospital,
	updateFinancialYear
} from '$lib/server/heka/administration/financial-year.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const data = await getFinancialYearsByHospital(event, { hospitalId });
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await createFinancialYear(event, {
		hospitalId,
		code: String(body.code ?? ''),
		startDate: body.startDate != null ? String(body.startDate) : null,
		endDate: body.endDate != null ? String(body.endDate) : null
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await updateFinancialYear(event, {
		id: Number(body.id),
		code: body.code != null ? String(body.code) : undefined,
		startDate:
			body.startDate === undefined
				? undefined
				: body.startDate != null
					? String(body.startDate)
					: null,
		endDate:
			body.endDate === undefined
				? undefined
				: body.endDate != null
					? String(body.endDate)
					: null
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteFinancialYear(event, { id: Number(body.id) });
	return json({ ok: true });
};

