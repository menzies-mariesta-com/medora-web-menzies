import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as sp from '$lib/server/heka/administration/supplier.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function optNum(v: unknown): number | null | undefined {
	if (v === undefined) return undefined;
	if (v === null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const qsp = event.url.searchParams;
	const mode = qsp.get('mode') ?? '';

	if (mode === 'search') {
		const q = qsp.get('q') ?? '';
		const limit = Number(qsp.get('limit') ?? '50');
		return json(
			await sp.searchSuppliersForHospital(hospitalId, {
				query: q,
				limit: Number.isFinite(limit) ? limit : 50
			})
		);
	}

	const idStr = qsp.get('id');
	if (idStr != null && idStr !== '') {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		return json(await sp.getSupplierById(hospitalId, { id }));
	}

	const page = Number(qsp.get('page') ?? '1');
	const pageSize = Number(qsp.get('pageSize') ?? '10');
	const search = qsp.get('search') ?? undefined;
	const code = qsp.get('code') ?? undefined;
	const phone = qsp.get('phone') ?? undefined;
	const statusIdRaw = qsp.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await sp.getSupplierPaginated(hospitalId, {
			page,
			pageSize,
			search:
				search != null && search.trim() !== '' ? search.trim() : undefined,
			code: code != null && code.trim() !== '' ? code.trim() : undefined,
			phone: phone != null && phone.trim() !== '' ? phone.trim() : undefined,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const name = body.name != null ? String(body.name) : '';
	const rawSt = body.statusId;
	const statusId =
		rawSt != null && rawSt !== '' && Number.isFinite(Number(rawSt))
			? Number(rawSt)
			: undefined;
	return json(
		await sp.createSupplier(hospitalId, {
			name,
			code: body.code != null ? String(body.code) : null,
			address: body.address != null ? String(body.address) : null,
			countryId: optNum(body.countryId),
			stateId: optNum(body.stateId),
			cityId: optNum(body.cityId),
			postalCodeId: optNum(body.postalCodeId),
			phone: body.phone != null ? String(body.phone) : null,
			phoneCountryId: optNum(body.phoneCountryId),
			email: body.email != null ? String(body.email) : null,
			remark: body.remark != null ? String(body.remark) : null,
			...(statusId !== undefined ? { statusId } : {})
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	return json(
		await sp.updateSupplier(hospitalId, {
			id,
			name: body.name === undefined ? undefined : String(body.name ?? ''),
			code:
				body.code === undefined
					? undefined
					: body.code != null
						? String(body.code)
						: null,
			address:
				body.address === undefined
					? undefined
					: body.address != null
						? String(body.address)
						: null,
			countryId:
				body.countryId === undefined ? undefined : optNum(body.countryId),
			stateId: body.stateId === undefined ? undefined : optNum(body.stateId),
			cityId: body.cityId === undefined ? undefined : optNum(body.cityId),
			postalCodeId:
				body.postalCodeId === undefined
					? undefined
					: optNum(body.postalCodeId),
			phone:
				body.phone === undefined
					? undefined
					: body.phone != null
						? String(body.phone)
						: null,
			phoneCountryId:
				body.phoneCountryId === undefined
					? undefined
					: optNum(body.phoneCountryId),
			email:
				body.email === undefined
					? undefined
					: body.email != null
						? String(body.email)
						: null,
			remark:
				body.remark === undefined
					? undefined
					: body.remark != null
						? String(body.remark)
						: null,
			statusId:
				body.statusId === undefined
					? undefined
					: body.statusId != null && body.statusId !== ''
						? Number(body.statusId)
						: undefined
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await sp.deleteSupplier(hospitalId, { id });
	return json({ ok: true });
}
