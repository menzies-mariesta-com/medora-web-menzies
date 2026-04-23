import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as setup from '$lib/server/heka/medication-order/medication-order-setup.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = setup.parseEntity(event.params.entity);
	if (!entity) throw error(400, 'Invalid entity');

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
	const search = event.url.searchParams.get('search') ?? undefined;
	const columnFilterKeys = new Set([
		'id',
		'name',
		'description',
		'code',
		'sequenceNo',
		'label',
		'kind',
		'summaryText'
	]);
	const columnFilters: Record<string, string> = {};
	for (const [k, v] of event.url.searchParams.entries()) {
		if (columnFilterKeys.has(k) && v.trim() !== '') {
			columnFilters[k] = v.trim();
		}
	}

	return json(
		await setup.listMasterPaginated(event, {
			hospitalId,
			entity,
			page,
			pageSize,
			search: search?.trim() ? search.trim() : undefined,
			columnFilters
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = setup.parseEntity(event.params.entity);
	if (!entity) throw error(400, 'Invalid entity');
	const payload = (await event.request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	return json(await setup.createMaster(event, { hospitalId, entity, payload }));
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = setup.parseEntity(event.params.entity);
	if (!entity) throw error(400, 'Invalid entity');
	const body = (await event.request.json().catch(() => ({}))) as {
		id?: unknown;
		[key: string]: unknown;
	};
	const id = Number(body.id ?? 0);
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	const { id: _i, ...payload } = body;
	return json(
		await setup.updateMaster(event, { hospitalId, entity, id, payload })
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = setup.parseEntity(event.params.entity);
	if (!entity) throw error(400, 'Invalid entity');
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	return json(await setup.deleteMaster(event, { hospitalId, entity, id }));
}
