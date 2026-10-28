import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { LabAccessionStatusEnum } from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { listReleasedResultsForVisit } from '$lib/server/medora/diagnostics/lab-result.server';
import type { PatientPortalContext } from './require-patient-context.server';

export async function listPatientReleasedLabResults(
	ctx: PatientPortalContext
) {
	const visits = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.patientId, ctx.patientId),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		);

	const visitIds = visits.map((v) => v.id);
	if (visitIds.length === 0) return [];

	const out: Awaited<ReturnType<typeof listReleasedResultsForVisit>> =
		[];
	for (const visitId of visitIds) {
		const rows = await listReleasedResultsForVisit({
			hospitalId: ctx.hospitalId,
			visitId
		});
		for (const r of rows) {
			out.push({ ...r, visitId });
		}
	}

	// Fallback summary rows without full observation expansion when visit list is huge
	if (out.length === 0 && visitIds.length > 0) {
		const summary = await ensureDb()
			.select({
				accessionId: table.labAccessionTable.id,
				accessionNo: table.labAccessionTable.accessionNo,
				releasedAt: table.labResultReportTable.releasedAt,
				serviceName: table.serviceItemTable.serviceName,
				visitId: table.labOrderTable.visitId
			})
			.from(table.labAccessionTable)
			.innerJoin(
				table.labOrderTable,
				eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
			)
			.innerJoin(
				table.labResultReportTable,
				eq(
					table.labResultReportTable.accessionId,
					table.labAccessionTable.id
				)
			)
			.innerJoin(
				table.serviceOrderDetailTable,
				eq(
					table.labOrderTable.serviceOrderDetailId,
					table.serviceOrderDetailTable.id
				)
			)
			.innerJoin(
				table.serviceItemTable,
				eq(
					table.serviceOrderDetailTable.serviceId,
					table.serviceItemTable.id
				)
			)
			.where(
				and(
					eq(table.labOrderTable.hospitalId, ctx.hospitalId),
					inArray(table.labOrderTable.visitId, visitIds),
					eq(
						table.labAccessionTable.accessionStatus,
						LabAccessionStatusEnum.RELEASED
					)
				)
			)
			.orderBy(desc(table.labResultReportTable.releasedAt));
		return summary;
	}

	return out.sort((a, b) =>
		String(b.releasedAt ?? '').localeCompare(
			String(a.releasedAt ?? '')
		)
	);
}

export async function getPatientReleasedLabResult(
	ctx: PatientPortalContext,
	accessionId: number
) {
	const [row] = await ensureDb()
		.select({ visitId: table.labOrderTable.visitId })
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			and(
				eq(table.labOrderTable.visitId, table.patientVisitTable.id),
				eq(table.patientVisitTable.patientId, ctx.patientId)
			)
		)
		.where(
			and(
				eq(table.labAccessionTable.id, accessionId),
				eq(table.labOrderTable.hospitalId, ctx.hospitalId),
				eq(
					table.labAccessionTable.accessionStatus,
					LabAccessionStatusEnum.RELEASED
				)
			)
		)
		.limit(1);

	if (!row?.visitId) return null;

	const results = await listReleasedResultsForVisit({
		hospitalId: ctx.hospitalId,
		visitId: row.visitId
	});
	return results.find((r) => r.accessionId === accessionId) ?? null;
}
