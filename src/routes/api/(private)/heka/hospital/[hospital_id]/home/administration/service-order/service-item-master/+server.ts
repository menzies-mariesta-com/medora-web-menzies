import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createServiceItem,
	deleteServiceItem,
	getServiceItems,
	getServiceItemsPaginated,
	updateServiceItem
} from '$lib/server/heka/administration/service-order/service-item.server';

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

	const subCategoryId = parseNumberOrNull(
		event.url.searchParams.get('subCategoryId')
	);
	const subCategoryIds = parseNumberList(
		event.url.searchParams.get('subCategoryIds')
	);
	const serviceName = event.url.searchParams.get('serviceName');
	const serviceCode = event.url.searchParams.get('serviceCode');
	const statusId = parseNumberOrNull(
		event.url.searchParams.get('statusId')
	);
	const id = parseNumberOrNull(event.url.searchParams.get('id'));

	if (mode === 'all') {
		const data = await getServiceItems(event, {
			hospitalId,
			subCategoryId,
			subCategoryIds,
			serviceName: serviceName?.trim() || null,
			serviceCode: serviceCode?.trim() || null,
			statusId,
			id
		});
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);

	const data = await getServiceItemsPaginated(event, {
		hospitalId,
		page,
		pageSize,
		subCategoryId,
		subCategoryIds,
		serviceName: serviceName?.trim() || null,
		serviceCode: serviceCode?.trim() || null,
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
	const data = await createServiceItem(event, {
		hospitalId,
		subCategoryId: Number(body.subCategoryId),
		serviceName: String(body.serviceName ?? ''),
		serviceCode:
			body.serviceCode != null ? String(body.serviceCode) : null,
		remark: body.remark != null ? String(body.remark) : null,
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
	const data = await updateServiceItem(event, {
		hospitalId,
		id: Number(body.id),
		serviceName:
			body.serviceName != null ? String(body.serviceName) : undefined,
		serviceCode:
			body.serviceCode !== undefined
				? body.serviceCode == null
					? null
					: String(body.serviceCode)
				: undefined,
		remark:
			body.remark !== undefined
				? body.remark == null
					? null
					: String(body.remark)
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
	await deleteServiceItem(event, { hospitalId, id: Number(body.id) });
	return json({ ok: true });
};
