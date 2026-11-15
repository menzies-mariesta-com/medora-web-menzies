import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteColorConfigurationOverride,
	getColorConfigurationByHospital,
	upsertColorConfiguration
} from '$lib/server/medora/administration/color-configuration.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const data = await getColorConfigurationByHospital(event, { hospitalId });
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await upsertColorConfiguration(event, {
		hospitalId,
		category: String(body.category ?? ''),
		entityKey: String(body.entityKey ?? ''),
		color: String(body.color ?? '')
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteColorConfigurationOverride(event, {
		hospitalId,
		category: String(body.category ?? ''),
		entityKey: String(body.entityKey ?? '')
	});
	return json({ ok: true });
};