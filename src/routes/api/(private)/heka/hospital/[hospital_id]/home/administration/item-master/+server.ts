import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as im from '$lib/server/heka/administration/item-master.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const sp = event.url.searchParams;
	const mode = sp.get('mode') ?? '';

	if (mode === 'categories') {
		return json(await im.getItemMasterCategories());
	}
	if (mode === 'unitTypes') {
		return json(await im.getUnitTypesForItemMaster());
	}
	if (mode === 'units') {
		const unitTypeIdRaw = sp.get('unitTypeId');
		const unitTypeId =
			unitTypeIdRaw != null && unitTypeIdRaw !== ''
				? Number(unitTypeIdRaw)
				: undefined;
		return json(
			await im.getUnitsForItemMaster({
				unitTypeId: Number.isFinite(unitTypeId as number)
					? unitTypeId
					: undefined
			})
		);
	}
	if (mode === 'unitById') {
		const id = Number(sp.get('id') ?? '0');
		if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
		return json(await im.getUnitById({ id }));
	}

	const idStr = sp.get('id');
	if (idStr) {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		return json(await im.getItemMasterById({ id }));
	}

	const exactBarcode = sp.get('exactBarcode')?.trim();
	if (exactBarcode) {
		return json(await im.getItemMasterByBarcode({ barcode: exactBarcode }));
	}

	const page = Number(sp.get('page') ?? '1');
	const pageSize = Number(sp.get('pageSize') ?? '10');
	const name = sp.get('name') ?? undefined;
	const itemCode = sp.get('itemCode') ?? undefined;
	const barcodeFilter = sp.get('barcode') ?? undefined;
	const categoryIdRaw = sp.get('categoryId');
	const categoryId =
		categoryIdRaw != null && categoryIdRaw !== ''
			? Number(categoryIdRaw)
			: undefined;
	const statusIdRaw = sp.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await im.getItemMasterPaginated({
			page,
			pageSize,
			name,
			itemCode,
			barcode: barcodeFilter,
			categoryId: Number.isFinite(categoryId as number)
				? categoryId
				: undefined,
			statusId: Number.isFinite(statusId as number) ? statusId : undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const payload = await event.request.json();
	return json(await im.createItemMaster(payload));
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const payload = await event.request.json();
	return json(await im.updateItemMaster(payload));
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await im.deleteItemMaster({ id });
	return json({ ok: true });
}
