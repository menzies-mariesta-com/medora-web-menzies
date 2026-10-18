import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as edAdmission from '$lib/server/medora/ed/ed-admission.server';
import { listEligibleSourceOpdVisits } from '$lib/server/medora/ipd/admission.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
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
			await listEligibleSourceOpdVisits({
				hospitalId,
				patientId
			})
		);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const search = event.url.searchParams.get('search') ?? undefined;
	const boardColumn =
		event.url.searchParams.get('boardColumn') ?? undefined;

	const visitId = event.url.searchParams.get('visitId')?.trim();
	if (visitId) {
		const detail = await edAdmission.getEdRegistrationByVisitId({
			hospitalId,
			visitId
		});
		if (!detail) throw error(404, 'Registration not found');
		return json(detail);
	}

	return json(
		await edAdmission.listEdRegistrationsPaginated({
			hospitalId,
			page,
			pageSize,
			search,
			boardColumn
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? 'register');

	if (action === 'register') {
		const patientId = String(body.patientId ?? '').trim();
		const branchId = String(body.branchId ?? '').trim();
		if (!patientId) throw error(400, 'patientId is required');
		if (!branchId) throw error(400, 'branchId is required');
		const sourceRaw = body.sourceOpdVisitId;
		const sourceOpdVisitId =
			sourceRaw != null && String(sourceRaw).trim() !== ''
				? String(sourceRaw).trim()
				: null;
		const edTriageLevelIdRaw = body.edTriageLevelId;
		const edTriageLevelId =
			edTriageLevelIdRaw != null && edTriageLevelIdRaw !== ''
				? Number(edTriageLevelIdRaw)
				: null;
		const erBedIdRaw = body.erBedId;
		const erBedId =
			erBedIdRaw != null && erBedIdRaw !== ''
				? Number(erBedIdRaw)
				: null;
		return json(
			await edAdmission.registerEdArrival(event, {
				hospitalId,
				patientId,
				branchId,
				chiefComplaint:
					body.chiefComplaint != null
						? String(body.chiefComplaint)
						: null,
				doctorId:
					body.doctorId != null ? String(body.doctorId) : null,
				sourceOpdVisitId,
				edTriageLevelId: Number.isFinite(edTriageLevelId as number)
					? edTriageLevelId
					: null,
				isMlc: Boolean(body.isMlc),
				registrationRemarks:
					body.registrationRemarks != null
						? String(body.registrationRemarks)
						: null,
				arrivedAt:
					body.arrivedAt != null ? String(body.arrivedAt) : null,
				erBedId: Number.isFinite(erBedId as number) ? erBedId : null
			})
		);
	}

	throw error(400, 'Unknown action');
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const visitId = String(body.visitId ?? '').trim();
	if (!visitId) throw error(400, 'visitId is required');
	const edTriageLevelIdRaw = body.edTriageLevelId;
	const edTriageLevelId =
		edTriageLevelIdRaw !== undefined
			? Number(edTriageLevelIdRaw)
			: undefined;
	await edAdmission.updateEdRegistration({
		hospitalId,
		visitId,
		branchId:
			body.branchId != null ? String(body.branchId) : undefined,
		chiefComplaint:
			body.chiefComplaint !== undefined
				? body.chiefComplaint != null
					? String(body.chiefComplaint)
					: null
				: undefined,
		doctorId:
			body.doctorId !== undefined
				? body.doctorId != null
					? String(body.doctorId)
					: null
				: undefined,
		edTriageLevelId:
			edTriageLevelId !== undefined && Number.isFinite(edTriageLevelId)
				? edTriageLevelId
				: edTriageLevelIdRaw === null
					? null
					: undefined,
		isMlc: body.isMlc !== undefined ? Boolean(body.isMlc) : undefined,
		registrationRemarks:
			body.registrationRemarks !== undefined
				? body.registrationRemarks != null
					? String(body.registrationRemarks)
					: null
				: undefined,
		arrivedAt:
			body.arrivedAt !== undefined
				? body.arrivedAt != null
					? String(body.arrivedAt)
					: null
				: undefined
	});
	return json({ ok: true });
}
