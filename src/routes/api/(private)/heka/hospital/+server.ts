import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createHospital,
	deleteHospital,
	getHospitalById,
	getHospitalsWithOwnerPaginated,
	updateHospital
} from '$lib/server/heka/hospital.server';

export const GET: RequestHandler = async (event) => {
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getHospitalById(event, id);
		return json(row);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : null;
	const ownerId = event.url.searchParams.get('ownerId');

	const data = await getHospitalsWithOwnerPaginated(event, {
		page,
		pageSize,
		statusId: statusId ?? undefined,
		ownerId: ownerId != null && ownerId !== '' ? ownerId : undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const created = await createHospital(event, {
		name: body.name != null ? String(body.name) : null,
		code: body.code != null ? String(body.code) : null,
		address: body.address != null ? String(body.address) : null,
		phone: body.phone != null ? String(body.phone) : null,
		email: body.email != null ? String(body.email) : null,
		website: body.website != null ? String(body.website) : null,
		logoUrl: body.logoUrl != null ? String(body.logoUrl) : null,
		description: body.description != null ? String(body.description) : null,
		ownerId: body.ownerId != null ? String(body.ownerId) : null,
		statusId: body.statusId != null ? Number(body.statusId) : undefined,
		phoneCountryId:
			body.phoneCountryId != null ? Number(body.phoneCountryId) : null,
		postalCodeId:
			body.postalCodeId != null ? Number(body.postalCodeId) : null,
		cityId: body.cityId != null ? Number(body.cityId) : null,
		stateId: body.stateId != null ? Number(body.stateId) : null,
		countryId: body.countryId != null ? Number(body.countryId) : null,
		establishedDate:
			body.establishedDate != null ? String(body.establishedDate) : null
	});
	return json(created);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await updateHospital(event, {
		id: String(body.id ?? ''),
		name: body.name === undefined ? undefined : body.name != null ? String(body.name) : null,
		code: body.code === undefined ? undefined : body.code != null ? String(body.code) : null,
		address:
			body.address === undefined
				? undefined
				: body.address != null
					? String(body.address)
					: null,
		phone: body.phone === undefined ? undefined : body.phone != null ? String(body.phone) : null,
		email: body.email === undefined ? undefined : body.email != null ? String(body.email) : null,
		website:
			body.website === undefined
				? undefined
				: body.website != null
					? String(body.website)
					: null,
		logoUrl:
			body.logoUrl === undefined
				? undefined
				: body.logoUrl != null
					? String(body.logoUrl)
					: null,
		description:
			body.description === undefined
				? undefined
				: body.description != null
					? String(body.description)
					: null,
		ownerId:
			body.ownerId === undefined
				? undefined
				: body.ownerId != null
					? String(body.ownerId)
					: null,
		statusId:
			body.statusId === undefined
				? undefined
				: body.statusId != null
					? Number(body.statusId)
					: undefined,
		phoneCountryId:
			body.phoneCountryId === undefined
				? undefined
				: body.phoneCountryId != null
					? Number(body.phoneCountryId)
					: undefined,
		postalCodeId:
			body.postalCodeId === undefined
				? undefined
				: body.postalCodeId != null
					? Number(body.postalCodeId)
					: undefined,
		cityId:
			body.cityId === undefined
				? undefined
				: body.cityId != null
					? Number(body.cityId)
					: undefined,
		stateId:
			body.stateId === undefined
				? undefined
				: body.stateId != null
					? Number(body.stateId)
					: undefined,
		countryId:
			body.countryId === undefined
				? undefined
				: body.countryId != null
					? Number(body.countryId)
					: undefined,
		establishedDate:
			body.establishedDate === undefined
				? undefined
				: body.establishedDate != null
					? String(body.establishedDate)
					: null
	});
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteHospital(event, { id: String(body.id ?? '') });
	return json({ ok: true });
};

