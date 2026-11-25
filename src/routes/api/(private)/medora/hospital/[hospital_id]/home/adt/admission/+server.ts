import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as admission from '$lib/server/medora/ipd/admission.server';
import { registerEdArrival } from '$lib/server/medora/ed/ed-admission.server';
import {
	isInpatientCareSetting,
	parseCareSetting
} from '$lib/model/enum/care-setting.enum';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function actorStaffId(event: RequestEvent): string | null {
	const staff = event.locals.staff;
	return staff?.id ? String(staff.id) : null;
}

/** Optional positive integer query param. */
function optionalNumberParam(event: RequestEvent, key: string): number | undefined {
	const raw = event.url.searchParams.get(key);
	if (raw == null || raw === '') return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
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
	return json(
		await admission.getIpdCensusPaginated({
			hospitalId,
			page,
			pageSize,
			wardId: optionalNumberParam(event, 'wardId'),
			careSetting: parseCareSetting(event.url.searchParams.get('careSetting')) ?? undefined,
			search: event.url.searchParams.get('search') ?? undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const action = String(body.action ?? 'admit');

	if (action === 'admit') {
		const careSetting = parseCareSetting(body.careSetting);
		if (!careSetting) {
			throw error(400, 'careSetting must be IPD, ED, ICU or OT');
		}
		const patientId = String(body.patientId ?? '').trim();
		const bedId = Number(body.bedId);
		const branchId = String(body.branchId ?? '');
		const sourceVisitId = parseUuid(
			body.sourceVisitId ?? body.sourceOpdVisitId ?? null
		);
		if (!patientId) throw error(400, 'patientId is required');
		if (!Number.isFinite(bedId) || bedId <= 0)
			throw error(400, 'bedId is required');
		if (!branchId) throw error(400, 'branchId is required');

		if (isInpatientCareSetting(careSetting)) {
			const orderRaw = body.admissionOrderId;
			const admissionOrderId =
				orderRaw != null && orderRaw !== '' ? Number(orderRaw) : null;
			return json(
				await admission.admitVisitToIpd(event, {
					hospitalId,
					patientId,
					bedId,
					branchId,
					careSetting,
					wardId:
						body.wardId != null && body.wardId !== ''
							? Number(body.wardId)
							: undefined,
					admittingDoctorId: body.admittingDoctorId ?? null,
					reasonNotes: body.reasonNotes ?? null,
					sourceVisitId,
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

		// ED: register the encounter and take the ER bed in one submit.
		const edTriageLevelIdRaw = body.edTriageLevelId;
		const edTriageLevelId =
			edTriageLevelIdRaw != null && edTriageLevelIdRaw !== ''
				? Number(edTriageLevelIdRaw)
				: null;
		return json(
			await registerEdArrival(event, {
				hospitalId,
				patientId,
				branchId,
				chiefComplaint:
					body.chiefComplaint != null
						? String(body.chiefComplaint)
						: null,
				doctorId:
					body.doctorId != null ? String(body.doctorId) : null,
				sourceVisitId,
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
				erBedId: bedId
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
