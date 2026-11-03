import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { StaffTypeEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { acuityDisplayForTriageLevelId } from '$lib/server/medora/er/ed-triage-level.server';
import { assignErBedToEncounter } from '$lib/server/medora/ed/er-bed-assignment.server';
import { ensureEdEncounter } from '$lib/server/medora/ed/ed-workbench.server';
import { createPatientVisitInHospital } from '$lib/server/medora/patient-visit/patient-visit.server';

export type RegisterEdArrivalPayload = {
	hospitalId: string;
	patientId: string;
	branchId: string;
	chiefComplaint?: string | null;
	doctorId?: string | null;
	sourceVisitId?: string | null;
	/** @deprecated use sourceVisitId */
	sourceOpdVisitId?: string | null;
	edTriageLevelId?: number | null;
	isMlc?: boolean;
	registrationRemarks?: string | null;
	arrivedAt?: string | null;
	erBedId?: number | null;
};

export type RegisterEdArrivalResult = {
	visitId: string;
	visitNo: string | null;
	edEncounterId: number;
};

async function applyEncounterRegistrationFields(input: {
	hospitalId: string;
	visitId: string;
	edTriageLevelId?: number | null;
	isMlc?: boolean;
	registrationRemarks?: string | null;
	arrivedAt?: string | null;
	doctorId?: string | null;
}) {
	const acuityLevel = await acuityDisplayForTriageLevelId(
		input.edTriageLevelId ?? undefined
	);
	await ensureDb()
		.update(table.edEncounterTable)
		.set({
			...(input.edTriageLevelId !== undefined
				? { edTriageLevelId: input.edTriageLevelId }
				: {}),
			...(input.isMlc !== undefined ? { isMlc: input.isMlc } : {}),
			...(input.registrationRemarks !== undefined
				? {
						registrationRemarks: input.registrationRemarks?.trim()
							? input.registrationRemarks.trim()
							: null
					}
				: {}),
			...(input.arrivedAt !== undefined && input.arrivedAt
				? { arrivedAt: input.arrivedAt }
				: {}),
			...(input.doctorId !== undefined
				? {
						assignedDoctorId: input.doctorId?.trim()
							? input.doctorId.trim()
							: null
					}
				: {}),
			...(acuityLevel != null ? { acuityLevel } : {})
		})
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		);
}

export async function registerEdArrival(
	event: RequestEvent,
	payload: RegisterEdArrivalPayload
): Promise<RegisterEdArrivalResult> {
	const patientId = String(payload.patientId ?? '').trim();
	const branchId = String(payload.branchId ?? '').trim();
	if (!patientId) throw error(400, 'patientId is required');
	if (!branchId) throw error(400, 'branchId is required');

	const staff = event.locals.staff;
	let doctorId = payload.doctorId?.trim() ? payload.doctorId.trim() : null;
	if (!doctorId && staff?.staffTypeId === StaffTypeEnum.DOCTOR) {
		doctorId = staff.id;
	}
	if (!doctorId) throw error(400, 'doctorId is required');

	const sourceRaw = payload.sourceVisitId ?? payload.sourceOpdVisitId;
	const sourceVisitId =
		typeof sourceRaw === 'string' && sourceRaw.trim() !== ''
			? sourceRaw.trim()
			: null;

	const visit = await createPatientVisitInHospital(event, {
		hospitalId: payload.hospitalId,
		branchId,
		patientId,
		visitTypeId: VisitTypeEnum.ED,
		doctorId,
		chiefComplaint: payload.chiefComplaint?.trim()
			? payload.chiefComplaint.trim()
			: null,
		...(sourceVisitId != null ? { sourceVisitId } : {})
	});

	const encounter = await ensureEdEncounter({
		hospitalId: payload.hospitalId,
		visitId: visit.id
	});

	await applyEncounterRegistrationFields({
		hospitalId: payload.hospitalId,
		visitId: visit.id,
		edTriageLevelId: payload.edTriageLevelId ?? null,
		isMlc: payload.isMlc ?? false,
		registrationRemarks: payload.registrationRemarks ?? null,
		arrivedAt: payload.arrivedAt ?? null,
		doctorId: doctorId ?? null
	});

	if (typeof payload.erBedId === 'number' && payload.erBedId > 0) {
		await assignErBedToEncounter({
			hospitalId: payload.hospitalId,
			visitId: visit.id,
			erBedId: payload.erBedId
		});
	}

	return {
		visitId: visit.id,
		visitNo: visit.visitNo,
		edEncounterId: encounter.id
	};
}
