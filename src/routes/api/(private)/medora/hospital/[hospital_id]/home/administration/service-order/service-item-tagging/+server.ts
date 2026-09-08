import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createServiceTagging,
	deleteServiceTagging,
	getServiceTaggings,
	getServiceTaggingsPaginated,
	updateServiceTagging
} from '$lib/server/medora/administration/service-order/service-tagging.server';

function parseNumberOrNull(value: string | null): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function parseNumberList(value: string | null): number[] | null {
	if (value == null || value.trim() === '') return null;
	return value
		.split(',')
		.map((s) => Number(s.trim()))
		.filter((n) => Number.isFinite(n));
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const mode = event.url.searchParams.get('mode') ?? 'paginated';

	const branchId = event.url.searchParams.get('branchId');
	const serviceId = parseNumberOrNull(
		event.url.searchParams.get('serviceId')
	);
	const serviceIds = parseNumberList(
		event.url.searchParams.get('serviceIds')
	);
	const serviceAmount = parseNumberOrNull(
		event.url.searchParams.get('serviceAmount')
	);
	const serviceTaxAmount = parseNumberOrNull(
		event.url.searchParams.get('serviceTaxAmount')
	);
	const statusId = parseNumberOrNull(
		event.url.searchParams.get('statusId')
	);
	const id = parseNumberOrNull(event.url.searchParams.get('id'));

	if (mode === 'all') {
		const data = await getServiceTaggings(event, {
			hospitalId,
			branchId: branchId?.trim() || null,
			serviceId,
			serviceIds,
			serviceAmount,
			serviceTaxAmount,
			statusId,
			id
		});
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);

	const data = await getServiceTaggingsPaginated(event, {
		hospitalId,
		page,
		pageSize,
		branchId: branchId?.trim() || undefined,
		serviceId,
		serviceIds,
		serviceAmount,
		serviceTaxAmount,
		statusId: statusId ?? undefined,
		id
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await createServiceTagging(event, {
		hospitalId,
		branchId: String(body.branchId ?? ''),
		serviceId: Number(body.serviceId),
		serviceAmount: String(body.serviceAmount ?? ''),
		serviceTaxAmount:
			body.serviceTaxAmount != null
				? String(body.serviceTaxAmount)
				: null,
		validDate: body.validDate != null ? String(body.validDate) : null,
		allowEdit: Boolean(body.allowEdit),
		statusId: Number(body.statusId ?? 1)
	} as any);
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await updateServiceTagging(event, {
		hospitalId,
		id: Number(body.id),
		serviceAmount:
			body.serviceAmount !== undefined
				? String(body.serviceAmount)
				: undefined,
		serviceTaxAmount:
			body.serviceTaxAmount !== undefined
				? body.serviceTaxAmount == null
					? null
					: String(body.serviceTaxAmount)
				: undefined,
		validDate:
			body.validDate !== undefined
				? body.validDate == null
					? null
					: String(body.validDate)
				: undefined,
		allowEdit:
			body.allowEdit !== undefined
				? Boolean(body.allowEdit)
				: undefined,
		statusId:
			body.statusId != null ? Number(body.statusId) : undefined
	} as any);
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	await deleteServiceTagging(event, {
		hospitalId,
		id: Number(body.id)
	});
	return json({ ok: true });
};
