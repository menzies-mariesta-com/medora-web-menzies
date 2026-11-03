import { StatusEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { listSourceLinkedVisitIds } from '$lib/server/medora/billing/visit-lineage.server';
import { syncOpenIpBillingForVisit } from '../../../../routes/api/(private)/medora/hospital/[hospital_id]/home/billing/ip-billing/visit-lines/+server.ts';
import { syncOpenOpBillingForVisit } from '../../../../routes/api/(private)/medora/hospital/[hospital_id]/home/billing/op-billing/visit-lines/+server.ts';
import { and, eq, ne } from 'drizzle-orm';

/** Materialize open draft bills for every visit in the source-visit chain. */
export async function syncSourceLinkedOpenBills(input: {
	hospitalId: string;
	visitId: string;
	userId: string;
	staffId: string | null;
}): Promise<void> {
	const db = ensureDb();
	const visitIds = await listSourceLinkedVisitIds({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		db
	});
	const nowIso = new Date().toISOString();

	for (const visitId of visitIds) {
		const [row] = await db
			.select({
				visitTypeId: table.patientVisitTable.visitTypeId,
				branchId: table.patientVisitTable.branchId
			})
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, visitId),
					eq(table.patientVisitTable.hospitalId, input.hospitalId),
					ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
				)
			)
			.limit(1);
		if (!row?.branchId) continue;

		const syncOpts = {
			hospitalId: input.hospitalId,
			visitId,
			branchId: row.branchId,
			userId: input.userId,
			staffId: input.staffId,
			nowIso
		};

		if (row.visitTypeId === VisitTypeEnum.IPD) {
			await syncOpenIpBillingForVisit(syncOpts);
		} else {
			await syncOpenOpBillingForVisit(syncOpts);
		}
	}
}
