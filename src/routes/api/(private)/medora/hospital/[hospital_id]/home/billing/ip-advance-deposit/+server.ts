import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as deposit from '$lib/server/medora/billing/ip-advance-deposit.server';

/**
 * @deprecated Prefer `/billing/ip-billing/advance-deposit`. Kept for compatibility.
 */
function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const admissionRaw = event.url.searchParams.get('admissionId');
	const visitRaw = event.url.searchParams.get('visitId');
	const search = event.url.searchParams.get('search') ?? undefined;
	const admissionId =
		admissionRaw != null && admissionRaw !== ''
			? Number(admissionRaw)
			: undefined;
	const visitId =
		visitRaw != null && visitRaw !== '' ? Number(visitRaw) : undefined;

	const hasAdmission =
		typeof admissionId === 'number' &&
		Number.isFinite(admissionId) &&
		admissionId > 0;
	const hasVisit =
		typeof visitId === 'number' &&
		Number.isFinite(visitId) &&
		visitId > 0;

	if (!hasAdmission && !hasVisit) {
		throw error(400, 'visitId or admissionId is required');
	}

	const rows = await deposit.listIpAdvanceDeposits({
		hospitalId,
		admissionId: hasAdmission ? admissionId : undefined,
		visitId: hasVisit ? visitId : undefined,
		search
	});

	let resolvedAdmissionId: number | null = hasAdmission
		? (admissionId as number)
		: null;
	if (resolvedAdmissionId == null && hasVisit) {
		resolvedAdmissionId = await deposit.resolveAdmissionIdForVisit({
			hospitalId,
			visitId: visitId as number
		});
	}

	return json({
		items: rows,
		admissionId: resolvedAdmissionId,
		totalAmount: rows.reduce(
			(sum, r) => sum + (Number(r.amount) || 0),
			0
		)
	});
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
