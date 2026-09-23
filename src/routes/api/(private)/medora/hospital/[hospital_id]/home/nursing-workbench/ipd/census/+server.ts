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

	const visitIdRaw = event.url.searchParams.get('visitId');
	if (visitIdRaw) {
		const visitId = Number(visitIdRaw);
		if (!Number.isFinite(visitId)) throw error(400, 'Invalid visitId');
		return json(
			await admission.getActiveAdmissionByVisit({ visitId })
		);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const branchId =
		event.url.searchParams.get('branchId') ?? undefined;
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
			branchId,
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
		const visitId = Number(body.visitId);
		const wardId = Number(body.wardId);
		const bedId = Number(body.bedId);
		const branchId = String(body.branchId ?? '');
		if (!Number.isFinite(visitId) || visitId <= 0)
			throw error(400, 'visitId is required');
		if (!Number.isFinite(wardId) || wardId <= 0)
			throw error(400, 'wardId is required');
		if (!Number.isFinite(bedId) || bedId <= 0)
			throw error(400, 'bedId is required');
		if (!branchId) throw error(400, 'branchId is required');
		return json(
			await admission.admitVisitToIpd({
				hospitalId,
				visitId,
				wardId,
				bedId,
				branchId,
				admittingDoctorId: body.admittingDoctorId ?? null,
				reasonNotes: body.reasonNotes ?? null,
				actorStaffId: actorStaffId(event)
			})
		);
	}

	if (action === 'transfer') {
		const admissionId = Number(body.admissionId);
		const toWardId = Number(body.toWardId);
		const toBedId = Number(body.toBedId);
		if (!Number.isFinite(admissionId) || admissionId <= 0)
			throw error(400, 'admissionId is required');
		if (!Number.isFinite(toWardId) || toWardId <= 0)
			throw error(400, 'toWardId is required');
		if (!Number.isFinite(toBedId) || toBedId <= 0)
			throw error(400, 'toBedId is required');
		return json(
			await admission.transferBed({
				hospitalId,
				admissionId,
				toWardId,
				toBedId,
				remark: body.remark ?? null,
				actorStaffId: actorStaffId(event)
			})
		);
	}

	if (action === 'discharge') {
		const admissionId = Number(body.admissionId);
		if (!Number.isFinite(admissionId) || admissionId <= 0)
			throw error(400, 'admissionId is required');
		return json(
			await admission.dischargeAdmission({
				hospitalId,
				admissionId
			})
		);
	}

	if (action === 'close') {
		const visitId = Number(body.visitId);
		if (!Number.isFinite(visitId) || visitId <= 0)
			throw error(400, 'visitId is required');
		await admission.closeIpdVisit({ hospitalId, visitId });
		return json({ ok: true });
	}

	throw error(400, 'Unknown action');
}
