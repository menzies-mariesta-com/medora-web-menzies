import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getOrCreateBillingPolicy,
	updateBillingPolicy,
	computeAccommodationCharges,
	postAccommodationLinesToIpBill
} from '$lib/server/medora/ipd/accommodation-billing.server';

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

	return json(
		await updateBillingPolicy({
			hospitalId,
			leastBillDuration:
				body.leastBillDuration !== undefined
					? body.leastBillDuration === null ||
						body.leastBillDuration === ''
						? null
						: String(body.leastBillDuration)
					: undefined,
			accommodationServiceItemId:
				body.accommodationServiceItemId !== undefined
					? body.accommodationServiceItemId === null
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
		})
	);
}
