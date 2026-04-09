import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import type { ItemUnitMasterSchemaUpdate } from '$lib/server/db/schema-type';
import * as ium from '$lib/server/heka/administration/item-unit-master.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const sp = event.url.searchParams;

	const idStr = sp.get('id');
	if (idStr != null && idStr !== '') {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		const row = await ium.getItemUnitMasterById(hospitalId, { id });
		if (!row) throw error(404, 'Not found');
		return json(row);
	}

	const page = Number(sp.get('page') ?? '1');
	const pageSize = Number(sp.get('pageSize') ?? '10');
	const search = sp.get('search') ?? undefined;
	const statusIdRaw = sp.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await ium.getItemUnitMasterPaginated(hospitalId, {
			page,
			pageSize,
			search:
				search != null && search.trim() !== '' ? search.trim() : undefined,
			statusId: Number.isFinite(statusId as number) ? statusId : undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const purchaseUnitId = Number(body.purchaseUnitId);
	const issueUnitId = Number(body.issueUnitId);
	if (!Number.isFinite(purchaseUnitId)) throw error(400, 'purchaseUnitId required');
	if (!Number.isFinite(issueUnitId)) throw error(400, 'issueUnitId required');
	return json(
		await ium.createItemUnitMaster(hospitalId, {
			purchaseUnitId,
			issueUnitId,
			purchaseConversionFactor: String(body.purchaseConversionFactor ?? ''),
			issueConversionFactor: String(body.issueConversionFactor ?? '')
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');

	const patch: ItemUnitMasterSchemaUpdate & { id: number } = { id };
	if (body.purchaseUnitId !== undefined) {
		patch.purchaseUnitId = Number(body.purchaseUnitId);
	}
	if (body.issueUnitId !== undefined) {
		patch.issueUnitId = Number(body.issueUnitId);
	}
	if (body.purchaseConversionFactor !== undefined) {
		patch.purchaseConversionFactor = String(body.purchaseConversionFactor);
	}
	if (body.issueConversionFactor !== undefined) {
		patch.issueConversionFactor = String(body.issueConversionFactor);
	}
	if (body.statusId !== undefined) {
		patch.statusId = Number(body.statusId);
	}

	return json(await ium.updateItemUnitMaster(hospitalId, patch));
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await ium.deleteItemUnitMaster(hospitalId, { id });
	return json({ ok: true });
}
