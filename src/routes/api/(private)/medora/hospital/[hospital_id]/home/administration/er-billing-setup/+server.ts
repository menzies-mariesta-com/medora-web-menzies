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
	const erConsumable = body.erConsumableServiceItemId;
	const patch: {
		erBedServiceItemId?: number | null;
		erConsumableServiceItemId?: number | null;
	} = {};
	if (erBed !== undefined) {
		if (erBed == null || erBed === '') patch.erBedServiceItemId = null;
		else {
			const n = Number(erBed);
			if (!Number.isFinite(n) || n <= 0) throw error(400, 'Invalid bed service item');
			patch.erBedServiceItemId = n;
		}
	}
	if (erConsumable !== undefined) {
		if (erConsumable == null || erConsumable === '')
			patch.erConsumableServiceItemId = null;
		else {
			const n = Number(erConsumable);
			if (!Number.isFinite(n) || n <= 0)
				throw error(400, 'Invalid consumable service item');
			patch.erConsumableServiceItemId = n;
		}
	}
	return json(
		await updateHospitalEdBillingConfig({
			hospitalId,
			...patch
		})
	);
};
