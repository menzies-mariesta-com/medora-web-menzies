import { and, count, desc, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { LabAccessionStatusEnum } from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { DoctorPortalContext } from './doctor-context.server';
import { safeLimit, text } from './doctor-utils.server';

export type DoctorResultListOptions = {
	patientId?: string;
	visitId?: string;
	limit?: number;
	/** Default true: only results from visits assigned to this doctor. */
	mineOnly?: boolean;
};

type ResultBaseRow = {
	accessionId: number;
	accessionNo: string;
	section: string;
	accessionStatus: string;
	releasedAt: string | null;
	reportStatus: string | null;
	visitId: string;
	visitNo: string | null;
	visitedAt: string;
	patientId: string;
	patientCode: string | null;
	patientFirstName: string | null;
	patientMiddleName: string | null;
	patientLastName: string | null;
	serviceName: string | null;
};

async function loadObservations(accessionIds: number[]) {
	if (accessionIds.length === 0) return new Map<number, unknown[]>();
	const rows = await ensureDb()
		.select({
			accessionId: table.labResultReportTable.accessionId,
			testCode: table.labTestTable.code,
			testName: table.labTestTable.name,
			valueNumeric: table.labResultObservationTable.valueNumeric,
			valueText: table.labResultObservationTable.valueText,
			unit: table.labResultObservationTable.unit,
			refRangeText: table.labResultObservationTable.refRangeText,
			abnormalFlag: table.labResultObservationTable.abnormalFlag,
			isCritical: table.labResultObservationTable.isCritical
		})
		.from(table.labResultObservationTable)
		.innerJoin(
			table.labResultReportTable,
			eq(
				table.labResultObservationTable.reportId,
				table.labResultReportTable.id
			)
		)
		.innerJoin(
			table.labTestTable,
			eq(
				table.labResultObservationTable.testId,
				table.labTestTable.id
			)
		)
		.where(
			inArray(table.labResultReportTable.accessionId, accessionIds)
		)
		.orderBy(table.labResultObservationTable.id);

	const map = new Map<number, unknown[]>();
	for (const row of rows) {
		const list = map.get(row.accessionId) ?? [];
		list.push({
			testCode: row.testCode,
			testName: row.testName,
			valueNumeric: row.valueNumeric,
			valueText: text(row.valueText),
			unit: text(row.unit),
			refRangeText: text(row.refRangeText),
			abnormalFlag: text(row.abnormalFlag),
			isCritical: row.isCritical
		});
		map.set(row.accessionId, list);
	}
	return map;
}

function mapRows(
	rows: ResultBaseRow[],
	observations: Map<number, unknown[]>
) {
	return rows.map((row) => {
		const items = (observations.get(row.accessionId) ?? []) as {
			isCritical?: boolean;
			abnormalFlag?: string | null;
		}[];
		return {
			accessionId: row.accessionId,
			accessionNo: row.accessionNo,
			section: row.section,
			accessionStatus: row.accessionStatus,
			releasedAt: row.releasedAt,
			reportStatus: row.reportStatus,
			visitId: row.visitId,
			visitNo: row.visitNo,
			visitedAt: row.visitedAt,
			patientId: row.patientId,
			patientCode: row.patientCode,
			patientName:
				[
					row.patientFirstName,
					row.patientMiddleName,
					row.patientLastName
				]
					.map((value) => value?.trim())
					.filter(Boolean)
					.join(' ')
					.trim() || row.patientCode,
			serviceName: row.serviceName,
			observations: items,
			abnormalCount: items.filter((item) =>
				Boolean(item.abnormalFlag?.trim())
			).length,
			criticalCount: items.filter((item) => item.isCritical).length
		};
	});
}

function resultConditions(
	ctx: DoctorPortalContext,
	options: DoctorResultListOptions
) {
	const mineOnly = options.mineOnly ?? true;
	return [
		eq(table.labOrderTable.hospitalId, ctx.hospitalId),
		eq(
			table.labAccessionTable.accessionStatus,
			LabAccessionStatusEnum.RELEASED
		),
		ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
		ne(table.patientTable.statusId, StatusEnum.DELETED),
		mineOnly
			? eq(table.patientVisitTable.doctorId, ctx.staffId)
			: undefined,
		options.patientId
			? eq(table.patientTable.id, options.patientId)
			: undefined,
		options.visitId
			? eq(table.patientVisitTable.id, options.visitId)
			: undefined,
		ctx.branchId
			? eq(table.patientVisitTable.branchId, ctx.branchId)
			: undefined
	];
}

export async function countDoctorLabResults(
	ctx: DoctorPortalContext,
	options: DoctorResultListOptions = {}
) {
	const [row] = await ensureDb()
		.select({ total: count() })
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.labOrderTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.labOrderTable.patientId, table.patientTable.id)
		)
		.where(and(...resultConditions(ctx, options)));
	return Number(row?.total ?? 0);
}

export async function listDoctorLabResults(
	ctx: DoctorPortalContext,
	options: DoctorResultListOptions = {}
) {
	const rows = await ensureDb()
		.select({
			accessionId: table.labAccessionTable.id,
			accessionNo: table.labAccessionTable.accessionNo,
			section: table.labAccessionTable.section,
			accessionStatus: table.labAccessionTable.accessionStatus,
			releasedAt: table.labResultReportTable.releasedAt,
			reportStatus: table.labResultReportTable.reportStatus,
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			visitedAt: table.patientVisitTable.createdAt,
			patientId: table.patientTable.id,
			patientCode: table.patientTable.code,
			patientFirstName: table.patientTable.firstName,
			patientMiddleName: table.patientTable.middleName,
			patientLastName: table.patientTable.lastName,
			serviceName: table.serviceItemTable.serviceName
		})
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.labOrderTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.labOrderTable.patientId, table.patientTable.id)
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
		.leftJoin(
			table.labResultReportTable,
			eq(
				table.labResultReportTable.accessionId,
				table.labAccessionTable.id
			)
		)
		.where(and(...resultConditions(ctx, options)))
		.orderBy(
			desc(table.labResultReportTable.releasedAt),
			desc(table.labAccessionTable.createdAt)
		)
		.limit(safeLimit(options.limit, 50));

	const observations = await loadObservations(
		rows.map((row) => row.accessionId)
	);
	return mapRows(rows as ResultBaseRow[], observations);
}

export async function getDoctorLabResult(
	ctx: DoctorPortalContext,
	accessionId: number
) {
	const rows = await ensureDb()
		.select({
			accessionId: table.labAccessionTable.id,
			accessionNo: table.labAccessionTable.accessionNo,
			section: table.labAccessionTable.section,
			accessionStatus: table.labAccessionTable.accessionStatus,
			releasedAt: table.labResultReportTable.releasedAt,
			reportStatus: table.labResultReportTable.reportStatus,
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			visitedAt: table.patientVisitTable.createdAt,
			patientId: table.patientTable.id,
			patientCode: table.patientTable.code,
			patientFirstName: table.patientTable.firstName,
			patientMiddleName: table.patientTable.middleName,
			patientLastName: table.patientTable.lastName,
			serviceName: table.serviceItemTable.serviceName
		})
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.labOrderTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.labOrderTable.patientId, table.patientTable.id)
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
		.leftJoin(
			table.labResultReportTable,
			eq(
				table.labResultReportTable.accessionId,
				table.labAccessionTable.id
			)
		)
		.where(
			and(
				eq(table.labAccessionTable.id, accessionId),
				eq(table.labOrderTable.hospitalId, ctx.hospitalId),
				eq(
					table.labAccessionTable.accessionStatus,
					LabAccessionStatusEnum.RELEASED
				),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
				ne(table.patientTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (rows.length === 0) return null;
	const observations = await loadObservations([accessionId]);
	return mapRows(rows as ResultBaseRow[], observations)[0] ?? null;
}
