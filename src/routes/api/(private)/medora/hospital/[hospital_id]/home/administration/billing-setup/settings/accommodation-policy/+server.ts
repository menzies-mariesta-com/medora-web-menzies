import { error, json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';
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
			billingMethod: policy.billingMethod,
			graceMinutes: policy.graceMinutes,
			minimumDays: policy.minimumDays,
			cutoffTime: policy.cutoffTime,
			accommodationServiceItemId: policy.accommodationServiceItemId,
			accommodationBillUnitId: policy.accommodationBillUnitId ?? null,
			leastBillDurationHours: policy.leastBillDurationHours,
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

	const method = Number(body.billingMethod);
	if (
		body.billingMethod !== undefined &&
		(!Number.isFinite(method) ||
			![
				IpdAccommodationBillingMethodEnum.BLOCK_24H,
				IpdAccommodationBillingMethodEnum.CALENDAR_DAY,
				IpdAccommodationBillingMethodEnum.PRO_RATA
			].includes(method))
	) {
		throw error(400, 'Invalid billing method');
	}

	const row = await updateBillingPolicy({
		hospitalId,
		careSetting,
		billingMethod: Number.isFinite(method) ? method : undefined,
		graceMinutes:
			body.graceMinutes !== undefined
				? Number(body.graceMinutes)
				: undefined,
		minimumDays:
			body.minimumDays !== undefined
				? body.minimumDays === null || body.minimumDays === ''
					? null
					: String(body.minimumDays)
				: undefined,
		cutoffTime:
			body.cutoffTime !== undefined ? String(body.cutoffTime) : undefined,
		leastBillDurationHours:
			body.leastBillDurationHours !== undefined
				? body.leastBillDurationHours === null ||
					body.leastBillDurationHours === ''
					? null
					: String(body.leastBillDurationHours)
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
