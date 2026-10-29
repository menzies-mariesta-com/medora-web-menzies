import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getOrCreateHospitalEdBillingConfig,
	updateHospitalEdBillingConfig
} from '$lib/server/medora/ed/hospital-ed-billing-config.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(await getOrCreateHospitalEdBillingConfig(hospitalId));
};

export const PATCH: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const erBed = body.erBedServiceItemId;
	const patch: { erBedServiceItemId?: number | null } = {};
	if (erBed !== undefined) {
		if (erBed == null || erBed === '') patch.erBedServiceItemId = null;
		else {
			const n = Number(erBed);
			if (!Number.isFinite(n) || n <= 0)
				throw error(400, 'Invalid bed service item');
			patch.erBedServiceItemId = n;
		}
	}
	return json(
		await updateHospitalEdBillingConfig({
			hospitalId,
			...patch
		})
	);
};
