import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createExternalRefer,
	deleteExternalRefer,
	getExternalReferByIdWithRelations,
	getExternalReferMeta,
	getExternalReferPaginated,
	updateExternalRefer
} from '$lib/server/heka/administration/external-refer.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;

	// For modal dropdowns (country/state/city/postal/title)
	if (event.url.searchParams.get('meta') === '1') {
		const meta = await getExternalReferMeta(event);
		return json(meta);
	}

	// For view/edit modal load
	const idStr = event.url.searchParams.get('id');
	if (idStr != null && idStr !== '') {
		const refer = await getExternalReferByIdWithRelations(event, {
			hospitalId,
			id: Number(idStr)
		});
		return json(refer);
	}

	// Default: paginated table
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const search = event.url.searchParams.get('search') ?? undefined;

	const data = await getExternalReferPaginated(event, {
		hospitalId,
		page,
		pageSize,
		search: search != null && search.trim() !== '' ? search : undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const created = await createExternalRefer(event, {
		hospitalId,
		titleId: body.titleId != null ? Number(body.titleId) : null,
		name: body.name != null ? String(body.name) : null,
		address: body.address != null ? String(body.address) : null,
		phoneCountryId: body.phoneCountryId != null ? Number(body.phoneCountryId) : null,
		phone: body.phone != null ? String(body.phone) : null,
		email: body.email != null ? String(body.email) : null,
		referTypeId: body.referTypeId != null ? Number(body.referTypeId) : null,
		countryId: body.countryId != null ? Number(body.countryId) : null,
		stateId: body.stateId != null ? Number(body.stateId) : null,
		cityId: body.cityId != null ? Number(body.cityId) : null,
		postalCodeId: body.postalCodeId != null ? Number(body.postalCodeId) : null,
		statusId: body.statusId != null ? Number(body.statusId) : undefined
	});
	return json(created);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await updateExternalRefer(event, {
		hospitalId,
		id: Number(body.id),
		titleId: body.titleId === undefined ? undefined : body.titleId != null ? Number(body.titleId) : null,
		name: body.name === undefined ? undefined : body.name != null ? String(body.name) : null,
		address:
			body.address === undefined
				? undefined
				: body.address != null
					? String(body.address)
					: null,
		phoneCountryId:
			body.phoneCountryId === undefined
				? undefined
				: body.phoneCountryId != null
					? Number(body.phoneCountryId)
					: null,
		phone: body.phone === undefined ? undefined : body.phone != null ? String(body.phone) : null,
		email: body.email === undefined ? undefined : body.email != null ? String(body.email) : null,
		referTypeId:
			body.referTypeId === undefined
				? undefined
				: body.referTypeId != null
					? Number(body.referTypeId)
					: null,
		countryId:
			body.countryId === undefined
				? undefined
				: body.countryId != null
					? Number(body.countryId)
					: null,
		stateId:
			body.stateId === undefined
				? undefined
				: body.stateId != null
					? Number(body.stateId)
					: null,
		cityId:
			body.cityId === undefined
				? undefined
				: body.cityId != null
					? Number(body.cityId)
					: null,
		postalCodeId:
			body.postalCodeId === undefined
				? undefined
				: body.postalCodeId != null
					? Number(body.postalCodeId)
					: null,
		statusId:
			body.statusId === undefined
				? undefined
				: body.statusId != null
					? Number(body.statusId)
					: undefined
	});
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteExternalRefer(event, { hospitalId, id: Number(body.id) });
	return json({ ok: true });
};

