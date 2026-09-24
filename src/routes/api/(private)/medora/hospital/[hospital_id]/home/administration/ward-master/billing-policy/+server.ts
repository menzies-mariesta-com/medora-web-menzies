import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getOrCreateBillingPolicy,
	updateBillingPolicy,
	computeAccommodationCharges,
	postAccommodationLinesToIpBill
} from '$lib/server/medora/ipd/accommodation-billing.server';
import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const admissionId = Number(
		event.url.searchParams.get('admissionId') ?? '0'
	);
	if (Number.isFinite(admissionId) && admissionId > 0) {
		return json(
			await computeAccommodationCharges({
				admissionId,
				hospitalId
			})
		);
	}

	return json(await getOrCreateBillingPolicy({ hospitalId }));
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();

	if (body.action === 'postCharges') {
		const admissionId = Number(body.admissionId);
		const ipBillingId = Number(body.ipBillingId);
		if (!Number.isFinite(admissionId) || admissionId <= 0) {
			throw error(400, 'admissionId is required');
		}
		if (!Number.isFinite(ipBillingId) || ipBillingId <= 0) {
			throw error(400, 'ipBillingId is required');
		}
		return json(
			await postAccommodationLinesToIpBill({
				hospitalId,
				admissionId,
				ipBillingId
			})
		);
	}

	const method = Number(body.billingMethod);
	if (
		method !== undefined &&
		Number.isFinite(method) &&
		![
			IpdAccommodationBillingMethodEnum.BLOCK_24H,
			IpdAccommodationBillingMethodEnum.CALENDAR_DAY,
			IpdAccommodationBillingMethodEnum.PRO_RATA
		].includes(method)
	) {
		throw error(400, 'Invalid billing method');
	}

	return json(
		await updateBillingPolicy({
			hospitalId,
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
				body.cutoffTime !== undefined
					? String(body.cutoffTime)
					: undefined,
			accommodationServiceItemId:
				body.accommodationServiceItemId !== undefined
					? body.accommodationServiceItemId === null
						? null
						: Number(body.accommodationServiceItemId)
					: undefined
		})
	);
}
