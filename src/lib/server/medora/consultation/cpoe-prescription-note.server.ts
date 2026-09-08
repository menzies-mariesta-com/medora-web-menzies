import { eq, max } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CpoePrescriptionNoteSchema,
	CpoePrescriptionNoteSchemaUpdate
} from '$lib/server/db/schema-type';
import { assertVisitNotClinicallySigned } from '$lib/server/visit-clinical-lock.server';
import { getPatientVisitById } from '$lib/server/medora/observation/observation-emr.server';

export async function getCpoePrescriptionNoteRowsByVisitId(input: {
	visitId: number;
	hospitalId: string;
}) {
	const visit = await getPatientVisitById({
		id: input.visitId,
		hospitalId: input.hospitalId
	});
	if (!visit) return [];
	return ensureDb().query.cpoePrescriptionNoteTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.visitId, input.visitId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		with: {
			doctor: { with: { staffDetail: true, title: true } }
		},
		orderBy: (t, { asc, desc }) => [
			asc(t.sequenceNo),
			desc(t.createdAt)
		]
	});
}

export type CpoePrescriptionNoteRowWithDoctor = Awaited<
	ReturnType<typeof getCpoePrescriptionNoteRowsByVisitId>
>[number];

export async function getCpoePrescriptionNoteById(input: {
	id: number;
	hospitalId: string;
}): Promise<CpoePrescriptionNoteRowWithDoctor | null> {
	const row = await ensureDb().query.cpoePrescriptionNoteTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(eq(t.id, input.id), ne(t.statusId, StatusEnum.DELETED)),
		with: {
			visit: true,
			doctor: { with: { staffDetail: true, title: true } }
		}
	});
	if (!row?.visit || row.visit.hospitalId !== input.hospitalId)
		return null;
	return row as CpoePrescriptionNoteRowWithDoctor;
}

export async function createCpoePrescriptionNote(
	hospitalId: string,
	payload: {
		visitId: number;
		note: string;
		doctorId?: string | null;
	}
): Promise<CpoePrescriptionNoteSchema> {
	const visit = await getPatientVisitById({
		id: payload.visitId,
		hospitalId
	});
	if (!visit) throw new Error('Visit not found');
	await assertVisitNotClinicallySigned(payload.visitId);
	const [agg] = await ensureDb()
		.select({ mx: max(table.cpoePrescriptionNoteTable.sequenceNo) })
		.from(table.cpoePrescriptionNoteTable)
		.where(eq(table.cpoePrescriptionNoteTable.visitId, payload.visitId));
	const nextSeq = Number(agg?.mx ?? 0) + 1;
	const note = (payload.note ?? '').trim();
	if (!note) throw new Error('Prescription note text is required');
	const [row] = await ensureDb()
		.insert(table.cpoePrescriptionNoteTable)
		.values({
			branchId: visit.branchId,
			patientId: visit.patientId,
			visitId: payload.visitId,
			note,
			doctorId:
				payload.doctorId != null &&
				String(payload.doctorId).trim() !== ''
					? String(payload.doctorId).trim()
					: null,
			statusId: StatusEnum.ACTIVE,
			sequenceNo: nextSeq
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateCpoePrescriptionNote(
	hospitalId: string,
	payload: {
		id: number;
		note: string;
	}
): Promise<CpoePrescriptionNoteSchema> {
	const existing = await getCpoePrescriptionNoteById({
		id: payload.id,
		hospitalId
	});
	if (!existing) throw new Error('Prescription note not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	const note = (payload.note ?? '').trim();
	if (!note) throw new Error('Prescription note text is required');
	const [row] = await ensureDb()
		.update(table.cpoePrescriptionNoteTable)
		.set({ note } satisfies CpoePrescriptionNoteSchemaUpdate)
		.where(eq(table.cpoePrescriptionNoteTable.id, payload.id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteCpoePrescriptionNote(input: {
	id: number;
	hospitalId: string;
	deleteRemark?: string | null;
}): Promise<void> {
	const existing = await getCpoePrescriptionNoteById({
		id: input.id,
		hospitalId: input.hospitalId
	});
	if (!existing) throw new Error('Prescription note not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	const remark =
		input.deleteRemark != null &&
		String(input.deleteRemark).trim() !== ''
			? String(input.deleteRemark).trim()
			: null;
	await ensureDb()
		.update(table.cpoePrescriptionNoteTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			deleteRemark: remark
		} satisfies CpoePrescriptionNoteSchemaUpdate)
		.where(eq(table.cpoePrescriptionNoteTable.id, input.id));
}
