import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as deposit from '$lib/server/medora/billing/ip-advance-deposit.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const admissionId = Number(
		event.url.searchParams.get('admissionId') ?? ''
	);
	const visitId = Number(event.url.searchParams.get('visitId') ?? '');
	if (
		(!Number.isFinite(admissionId) || admissionId <= 0) &&
		(!Number.isFinite(visitId) || visitId <= 0)
	) {
		throw error(400, 'visitId or admissionId is required');
	}
	return json(
		await deposit.listIpAdvanceDeposits({
			hospitalId,
			admissionId:
				Number.isFinite(admissionId) && admissionId > 0
					? admissionId
					: undefined,
			visitId:
				Number.isFinite(visitId) && visitId > 0 ? visitId : undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const staff = event.locals.staff;
	return json(
		await deposit.createIpAdvanceDeposit({
			hospitalId,
			admissionId:
				body.admissionId != null && body.admissionId !== ''
					? Number(body.admissionId)
					: undefined,
			visitId:
				body.visitId != null && body.visitId !== ''
					? Number(body.visitId)
					: undefined,
			amount: String(body.amount ?? ''),
			paymentMethod: body.paymentMethod ?? 'cash',
			notes: body.notes ?? null,
			paidByStaffId: staff?.id ? String(staff.id) : null
		})
	);
}
