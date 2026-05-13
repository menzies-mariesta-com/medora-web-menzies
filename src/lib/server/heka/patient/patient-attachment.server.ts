import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientAttachmentSchema } from '$lib/server/db/schema-type';

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getVisitBasicsForPatientAttachment(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number }
): Promise<{ patientId: string; hospitalId: string } | null> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const row = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.visitId),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		columns: { patientId: true, hospitalId: true }
	});
	if (!row?.patientId || !row.hospitalId) return null;
	return { patientId: row.patientId, hospitalId: row.hospitalId };
}

export async function getPatientAttachmentsByPatientId(
	event: RequestEvent,
	input: { hospitalId: string; patientId: string }
): Promise<PatientAttachmentSchema[]> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	return ensureDb()
		.select()
		.from(table.patientAttachmentTable)
		.where(
			and(
				eq(table.patientAttachmentTable.patientId, input.patientId),
				ne(table.patientAttachmentTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.patientAttachmentTable.createdAt));
}

export async function createPatientAttachment(
	event: RequestEvent,
	input: {
		hospitalId: string;
		patientId: string;
		fileUrl: string;
		description?: string | null;
	}
): Promise<PatientAttachmentSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const [row] = await ensureDb()
		.insert(table.patientAttachmentTable)
		.values({
			patientId: input.patientId,
			fileUrl: input.fileUrl,
			description: input.description ?? null,
			createdBy: event.locals.user?.id ?? null,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.returning();
	if (!row) throw error(500, 'Failed to create attachment');
	return row;
}

export async function deletePatientAttachment(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	await ensureDb()
		.update(table.patientAttachmentTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.where(eq(table.patientAttachmentTable.id, input.id));
}

export async function getPatientDisplayName(
	event: RequestEvent,
	input: { hospitalId: string; patientId: string }
): Promise<{ label: string } | null> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const row = await ensureDb().query.patientTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.patientId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		columns: {
			id: true,
			firstName: true,
			middleName: true,
			lastName: true,
			code: true
		}
	});
	if (!row) return null;
	const parts = [row.firstName, row.middleName, row.lastName].filter(
		Boolean
	);
	const name = parts.join(' ').trim();
	const label = row.code?.trim()
		? `${name} (${row.code.trim()})`
		: name || row.id;
	return { label };
}
