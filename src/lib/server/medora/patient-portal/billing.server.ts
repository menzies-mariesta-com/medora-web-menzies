import { and, desc, eq, inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PatientPortalContext } from './require-patient-context.server';

export async function listPatientBills(ctx: PatientPortalContext) {
	const visits = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.patientId, ctx.patientId),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId)
			)
		);
	const visitIds = visits.map((v) => v.id);
	if (visitIds.length === 0) return [];

	return ensureDb().query.opBillingTable.findMany({
		where: and(
			eq(table.opBillingTable.hospitalId, ctx.hospitalId),
			inArray(table.opBillingTable.visitId, visitIds)
		),
		with: { statusTagging: true },
		orderBy: desc(table.opBillingTable.createdAt)
	});
}
