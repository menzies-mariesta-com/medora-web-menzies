import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	requireClinicalStaff,
	requireConsultant
} from './clinical-authority.server';

export async function getDischargeSummary(input: {
	hospitalId: string;
	visitId: number;
}) {
	const [row] = await ensureDb()
		.select()
		.from(table.dischargeSummaryTable)
		.where(
			and(
				eq(table.dischargeSummaryTable.hospitalId, input.hospitalId),
				eq(table.dischargeSummaryTable.visitId, input.visitId),
				ne(table.dischargeSummaryTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertDischargeSummary(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		hospitalCourse: string;
		dischargeMedications: string;
		followUp: string;
		redFlags: string;
	}
) {
	const staff = requireClinicalStaff(event);
	const db = ensureDb();
	const [visit] = await db
		.select({
			id: table.patientVisitTable.id,
			branchId: table.patientVisitTable.branchId,
			patientId: table.patientVisitTable.patientId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');

	const existing = await getDischargeSummary(input);
	const values = {
		hospitalCourse: input.hospitalCourse.trim(),
		dischargeMedications: input.dischargeMedications.trim(),
		followUp: input.followUp.trim(),
		redFlags: input.redFlags.trim(),
		draftedBy: staff.id
	};
	if (existing) {
		if (existing.signedAt)
			throw error(409, 'Signed summary cannot be edited');
		const [updated] = await db
			.update(table.dischargeSummaryTable)
			.set(values)
			.where(eq(table.dischargeSummaryTable.id, existing.id))
			.returning();
		return updated;
	}
	const [created] = await db
		.insert(table.dischargeSummaryTable)
		.values({
			visitId: visit.id,
			hospitalId: input.hospitalId,
			branchId: visit.branchId,
			patientId: visit.patientId,
			...values
		})
		.returning();
	if (!created) throw error(500, 'Unable to save discharge summary');
	return created;
}

export async function signDischargeSummary(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number }
) {
	const consultantId = requireConsultant(event);
	const existing = await getDischargeSummary(input);
	if (!existing)
		throw error(400, 'Draft discharge summary is required');
	if (!existing.hospitalCourse.trim()) {
		throw error(400, 'Hospital course is required before signing');
	}
	const [updated] = await ensureDb()
		.update(table.dischargeSummaryTable)
		.set({
			signedBy: consultantId,
			signedAt: new Date(),
			cosignedBy: consultantId,
			cosignedAt: new Date()
		})
		.where(eq(table.dischargeSummaryTable.id, existing.id))
		.returning();
	if (!updated) throw error(500, 'Unable to sign discharge summary');
	return updated;
}

export async function assertDischargeSummarySigned(input: {
	hospitalId: string;
	visitId: number;
}): Promise<void> {
	const summary = await getDischargeSummary(input);
	if (!summary?.signedAt) {
		throw error(
			409,
			'A consultant-signed discharge summary is required before discharge'
		);
	}
}
