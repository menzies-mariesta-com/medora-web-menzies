import { error, json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getOrCreateBillingPolicy,
	parseAccommodationCareSetting,
	resolveAccommodationBillUnitLabel,
	updateBillingPolicy
} from '$lib/server/medora/ipd/accommodation-billing.server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

function hospitalIdFrom(params: { hospital_id?: string }): string {
	const hid = params.hospital_id ?? '';
	if (!hid) throw error(400, 'Missing hospital id');
	return hid;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const careSetting = parseAccommodationCareSetting(
		event.url.searchParams.get('careSetting')
	);

	const policy = await getOrCreateBillingPolicy({ hospitalId, careSetting });
	let accommodationServiceName: string | null = null;
	if (policy.accommodationServiceItemId != null) {
		const [svc] = await ensureDb()
			.select({ name: table.serviceItemTable.serviceName })
			.from(table.serviceItemTable)
			.where(
				eq(table.serviceItemTable.id, policy.accommodationServiceItemId)
			)
			.limit(1);
		accommodationServiceName = svc?.name?.trim() ?? null;
	}

	const accommodationBillUnitName = await resolveAccommodationBillUnitLabel(
		policy.accommodationBillUnitId
	);

	return json({
		policy: {
			id: policy.id,
			hospitalId: policy.hospitalId,
			careSetting: policy.careSetting,
			accommodationServiceItemId: policy.accommodationServiceItemId,
			accommodationBillUnitId: policy.accommodationBillUnitId ?? null,
			leastBillDuration: policy.leastBillDuration,
			statusId: policy.statusId
		},
		accommodationServiceName,
		accommodationBillUnitName
	});
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const careSetting = parseAccommodationCareSetting(
		body.careSetting ?? event.url.searchParams.get('careSetting')
	);

	const row = await updateBillingPolicy({
		hospitalId,
		careSetting,
		leastBillDuration:
			body.leastBillDuration !== undefined
				? body.leastBillDuration === null ||
					body.leastBillDuration === ''
					? null
					: String(body.leastBillDuration)
				: undefined,
		accommodationServiceItemId:
			body.accommodationServiceItemId !== undefined
				? body.accommodationServiceItemId === null ||
					body.accommodationServiceItemId === ''
					? null
					: Number(body.accommodationServiceItemId)
				: undefined,
		accommodationBillUnitId:
			body.accommodationBillUnitId !== undefined
				? body.accommodationBillUnitId === null ||
					body.accommodationBillUnitId === ''
					? null
					: Number(body.accommodationBillUnitId)
				: undefined
	});

	return json({ ok: true, policy: row });
};
