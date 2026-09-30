import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as admission from '$lib/server/medora/ipd/admission.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function actorStaffId(event: RequestEvent): string | null {
	const staff = event.locals.staff;
	return staff?.id ? String(staff.id) : null;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode');
	if (mode === 'source-opd') {
		const patientId = String(
			event.url.searchParams.get('patientId') ?? ''
		).trim();
		if (!patientId) throw error(400, 'patientId is required');
		return json(
			await admission.listEligibleSourceOpdVisits({
				hospitalId,
				patientId
			})
		);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const wardIdRaw = event.url.searchParams.get('wardId');
	const wardId =
		wardIdRaw != null && wardIdRaw !== ''
			? Number(wardIdRaw)
			: undefined;
	const search = event.url.searchParams.get('search') ?? undefined;
	return json(
		await admission.getIpdCensusPaginated({
			hospitalId,
			page,
			pageSize,
			wardId: Number.isFinite(wardId as number) ? wardId : undefined,
			search
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const action = String(body.action ?? 'admit');

	if (action === 'admit') {
		const patientId = String(body.patientId ?? '').trim();
		const bedId = Number(body.bedId);
		const branchId = String(body.branchId ?? '');
		const wardIdRaw = body.wardId;
		const wardId =
			wardIdRaw != null && wardIdRaw !== ''
				? Number(wardIdRaw)
				: undefined;
		const sourceRaw = body.sourceOpdVisitId;
		const sourceOpdVisitId =
			sourceRaw != null && sourceRaw !== ''
				? Number(sourceRaw)
				: null;
		const orderRaw = body.admissionOrderId;
		const admissionOrderId =
			orderRaw != null && orderRaw !== '' ? Number(orderRaw) : null;
		if (!patientId) throw error(400, 'patientId is required');
		if (!Number.isFinite(bedId) || bedId <= 0)
			throw error(400, 'bedId is required');
		if (!branchId) throw error(400, 'branchId is required');
		return json(
			await admission.admitVisitToIpd(event, {
				hospitalId,
				patientId,
				bedId,
				branchId,
				wardId: Number.isFinite(wardId as number) ? wardId : undefined,
				admittingDoctorId: body.admittingDoctorId ?? null,
				reasonNotes: body.reasonNotes ?? null,
				sourceOpdVisitId:
					sourceOpdVisitId != null &&
					Number.isFinite(sourceOpdVisitId) &&
					sourceOpdVisitId > 0
						? sourceOpdVisitId
						: null,
				admissionOrderId:
					admissionOrderId != null &&
					Number.isFinite(admissionOrderId) &&
					admissionOrderId > 0
						? admissionOrderId
						: null,
				actorStaffId: actorStaffId(event)
			})
		);
	}

	if (action === 'discharge') {
		const admissionId = Number(body.admissionId);
		if (!Number.isFinite(admissionId) || admissionId <= 0)
			throw error(400, 'admissionId is required');
		await admission.dischargeAdmission({
			hospitalId,
			admissionId
		});
		return json({ ok: true });
	}

	throw error(400, 'Unknown action');
}
