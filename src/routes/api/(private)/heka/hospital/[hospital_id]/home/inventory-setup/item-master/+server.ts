import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as im from '$lib/server/heka/administration/item-master.server';
import { StatusEnum } from '$lib/model/enum/db-link';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

/** `undefined` = omit (server picks first among links); `null` / invalid = treat as unset → first link. */
function readDefaultItemUnitMasterId(
	body: Record<string, unknown>
): number | null | undefined {
	if (!('defaultItemUnitMasterId' in body)) return undefined;
	const v = body.defaultItemUnitMasterId;
	if (v === null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? n : null;
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
	if (mode === 'itemUnitMasters') {
		return json(await im.listItemUnitMastersForItemMaster(hospitalId));
	}

	const idStr = sp.get('id');
	if (idStr) {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		return json(await im.getItemMasterById({ hospitalId, id }));
	}

	const exactBarcode = sp.get('exactBarcode')?.trim();
	if (exactBarcode) {
		return json(
			await im.getItemMasterByBarcode({
				hospitalId,
				barcode: exactBarcode
			})
		);
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
		await im.getItemMasterPaginated(hospitalId, {
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
	const body = (await event.request.json()) as Record<string, unknown>;
	const categoryId = Number(body.categoryId);
	const statusId = Number(body.statusId ?? StatusEnum.ACTIVE);
	const pgRaw = body.pharmacyGenericId;
	const pharmacyGenericId =
		pgRaw != null && pgRaw !== '' ? Number(pgRaw) : null;
	const mfrRaw = body.manufacturerId;
	const manufacturerId =
		mfrRaw != null && mfrRaw !== ''
			? Number(mfrRaw)
			: mfrRaw === null
				? null
				: undefined;
	const isBatchRequired = Boolean(body.isBatchRequired);
	const created = await im.createItemMaster(hospitalId, {
			itemName: String(body.itemName ?? ''),
			categoryId: Number.isFinite(categoryId) ? categoryId : 0,
			itemCode:
				body.itemCode != null && String(body.itemCode).trim() !== ''
					? String(body.itemCode).trim()
					: null,
			barcode:
				body.barcode != null && String(body.barcode).trim() !== ''
					? String(body.barcode).trim()
					: null,
			pharmacyGenericId: Number.isFinite(pharmacyGenericId as number)
				? pharmacyGenericId
				: null,
			manufacturerId:
				manufacturerId === undefined
					? undefined
					: Number.isFinite(manufacturerId as number)
						? (manufacturerId as number)
						: null,
			description:
				body.description != null && String(body.description).trim() !== ''
					? String(body.description).trim()
					: null,
			remark:
				body.remark != null && String(body.remark).trim() !== ''
					? String(body.remark).trim()
					: null,
			statusId: Number.isFinite(statusId) ? statusId : undefined,
			isBatchRequired
	});

	const iumIdsRaw = body.itemUnitMasterIds;
	if (Array.isArray(iumIdsRaw)) {
		await im.setItemUnitMastersForItem(hospitalId, {
			itemMasterId: created.id,
			itemUnitMasterIds: iumIdsRaw.map((x) => Number(x)),
			defaultItemUnitMasterId: readDefaultItemUnitMasterId(body)
		});
	}

	return json(created);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	const pgRaw = body.pharmacyGenericId;
	const pharmacyGenericId =
		body.pharmacyGenericId === undefined
			? undefined
			: pgRaw != null && pgRaw !== ''
				? Number(pgRaw)
				: null;
	const mfrRaw = body.manufacturerId;
	const manufacturerId =
		body.manufacturerId === undefined
			? undefined
			: mfrRaw != null && mfrRaw !== ''
				? Number(mfrRaw)
				: null;
	return json(
		await im.updateItemMaster(hospitalId, {
			id,
			itemName:
				body.itemName === undefined
					? undefined
					: String(body.itemName ?? ''),
			categoryId:
				body.categoryId === undefined ? undefined : Number(body.categoryId),
			itemCode:
				body.itemCode === undefined
					? undefined
					: body.itemCode != null && String(body.itemCode).trim() !== ''
						? String(body.itemCode).trim()
						: null,
			barcode:
				body.barcode === undefined
					? undefined
					: body.barcode != null && String(body.barcode).trim() !== ''
						? String(body.barcode).trim()
						: null,
			pharmacyGenericId,
			manufacturerId:
				manufacturerId === undefined
					? undefined
					: Number.isFinite(manufacturerId as number)
						? (manufacturerId as number)
						: null,
			description:
				body.description === undefined
					? undefined
					: body.description != null &&
						  String(body.description).trim() !== ''
						? String(body.description).trim()
						: null,
			remark:
				body.remark === undefined
					? undefined
					: body.remark != null && String(body.remark).trim() !== ''
						? String(body.remark).trim()
						: null,
			statusId:
				body.statusId === undefined ? undefined : Number(body.statusId),
			isBatchRequired:
				body.isBatchRequired === undefined
					? undefined
					: Boolean(body.isBatchRequired)
		}).then(async (updated) => {
			const iumIdsRaw = body.itemUnitMasterIds;
			if (Array.isArray(iumIdsRaw)) {
				await im.setItemUnitMastersForItem(hospitalId, {
					itemMasterId: id,
					itemUnitMasterIds: iumIdsRaw.map((x) => Number(x)),
					defaultItemUnitMasterId: readDefaultItemUnitMasterId(body)
				});
			}
			return updated;
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await im.deleteItemMaster({ hospitalId, id });
	return json({ ok: true });
}
