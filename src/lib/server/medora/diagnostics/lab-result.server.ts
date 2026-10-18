import { error } from '@sveltejs/kit';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import {
	LabAccessionStatusEnum,
	LabCriticalPolicyEnum,
	LabObservationSourceEnum,
	LabObservationStatusEnum,
	LabResultReportStatusEnum
} from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getOrCreateHospitalLabSetting } from './hospital-lab-setting.server';
import { writeLabAudit } from './lab-audit.server';
import { ensureCriticalCallbackForObservation } from './lab-critical-callback.server';

function parseNum(v: string | null | undefined): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function evaluateObservation(input: {
	valueNumeric: number | null;
	valueText: string | null;
	test: {
		refRangeLow: string | null;
		refRangeHigh: string | null;
		criticalLow: string | null;
		criticalHigh: string | null;
		refRangeText: string | null;
		unit: string | null;
	};
}): { abnormalFlag: string | null; isCritical: boolean; refRangeText: string | null } {
	const n = input.valueNumeric;
	const low = parseNum(input.test.refRangeLow);
	const high = parseNum(input.test.refRangeHigh);
	const critLow = parseNum(input.test.criticalLow);
	const critHigh = parseNum(input.test.criticalHigh);
	let abnormalFlag: string | null = null;
	let isCritical = false;
	if (n != null) {
		if (critLow != null && n <= critLow) isCritical = true;
		if (critHigh != null && n >= critHigh) isCritical = true;
		if (low != null && n < low) abnormalFlag = 'L';
		if (high != null && n > high) abnormalFlag = 'H';
	}
	const refRangeText =
		input.test.refRangeText ??
		(low != null && high != null ? `${low}-${high}` : null);
	return { abnormalFlag, isCritical, refRangeText };
}

async function getReportForAccession(accessionId: number) {
	const [report] = await ensureDb()
		.select()
		.from(table.labResultReportTable)
		.where(eq(table.labResultReportTable.accessionId, accessionId))
		.limit(1);
	return report ?? null;
}

export async function getResultEntryForAccession(input: {
	hospitalId: string;
	accessionId: number;
}) {
	const [acc] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!acc) throw error(404, 'Accession not found');

	const report = await getReportForAccession(acc.id);
	if (!report) throw error(404, 'Report not found');

	const requested = (acc.requestedTestsJson as { id: number }[]) ?? [];
	const testIds = requested.map((t) => t.id);

	const observations = await ensureDb()
		.select({
			obs: table.labResultObservationTable,
			testCode: table.labTestTable.code,
			testName: table.labTestTable.name
		})
		.from(table.labResultObservationTable)
		.innerJoin(
			table.labTestTable,
			eq(table.labResultObservationTable.testId, table.labTestTable.id)
		)
		.where(eq(table.labResultObservationTable.reportId, report.id));

	const obsByTest = new Map(observations.map((o) => [o.obs.testId, o]));

	const allTests =
		testIds.length > 0
			? await ensureDb()
					.select()
					.from(table.labTestTable)
					.where(
						and(
							inArray(table.labTestTable.id, testIds),
							ne(table.labTestTable.statusId, StatusEnum.DELETED)
						)
					)
			: [];
	const testMap = new Map(allTests.map((t) => [t.id, t]));

	return {
		accession: acc,
		report,
		lines: testIds.map((testId) => {
			const existing = obsByTest.get(testId);
			const test = testMap.get(testId);
			return {
				testId,
				testCode: existing?.testCode ?? test?.code ?? '',
				testName: existing?.testName ?? test?.name ?? '',
				observationId: existing?.obs.id ?? null,
				valueNumeric: existing?.obs.valueNumeric ?? null,
				valueText: existing?.obs.valueText ?? null,
				unit: existing?.obs.unit ?? test?.unit ?? null,
				refRangeText: existing?.obs.refRangeText ?? test?.refRangeText,
				abnormalFlag: existing?.obs.abnormalFlag ?? null,
				isCritical: existing?.obs.isCritical ?? false,
				observationStatus: existing?.obs.observationStatus ?? 'draft'
			};
		})
	};
}

export async function saveObservations(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
	lines: {
		testId: number;
		valueNumeric?: string | null;
		valueText?: string | null;
	}[];
}) {
	const [acc] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!acc) throw error(404, 'Accession not found');

	const report = await getReportForAccession(acc.id);
	if (!report) throw error(404, 'Report not found');

	const now = new Date().toISOString();

	for (const line of input.lines) {
		const [test] = await ensureDb()
			.select()
			.from(table.labTestTable)
			.where(eq(table.labTestTable.id, line.testId))
			.limit(1);
		if (!test) continue;

		const valueNumeric = parseNum(line.valueNumeric ?? null);
		const evalResult = evaluateObservation({
			valueNumeric,
			valueText: line.valueText ?? null,
			test
		});

		const [existing] = await ensureDb()
			.select()
			.from(table.labResultObservationTable)
			.where(
				and(
					eq(table.labResultObservationTable.reportId, report.id),
					eq(table.labResultObservationTable.testId, line.testId)
				)
			)
			.limit(1);

		const values = {
			valueNumeric: valueNumeric != null ? String(valueNumeric) : null,
			valueText: line.valueText ?? null,
			unit: test.unit,
			refRangeText: evalResult.refRangeText,
			abnormalFlag: evalResult.abnormalFlag,
			isCritical: evalResult.isCritical,
			enteredBy: input.staffId,
			source: LabObservationSourceEnum.MANUAL,
			updatedAt: now
		};

		if (existing) {
			await ensureDb()
				.update(table.labResultObservationTable)
				.set(values)
				.where(eq(table.labResultObservationTable.id, existing.id));
		} else {
			await ensureDb().insert(table.labResultObservationTable).values({
				reportId: report.id,
				testId: line.testId,
				observationStatus: LabObservationStatusEnum.DRAFT,
				...values
			});
		}
	}

	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.RESULTED,
			updatedAt: now
		})
		.where(eq(table.labAccessionTable.id, acc.id));

	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_accession',
		entityId: acc.id,
		action: 'resulted',
		staffId: input.staffId
	});
}

export async function verifyReport(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
}) {
	const now = new Date().toISOString();
	const report = await getReportForAccession(input.accessionId);
	if (!report) throw error(404, 'Report not found');

	await ensureDb()
		.update(table.labResultReportTable)
		.set({
			verifiedAt: now,
			verifiedBy: input.staffId,
			updatedAt: now
		})
		.where(eq(table.labResultReportTable.id, report.id));

	await ensureDb()
		.update(table.labResultObservationTable)
		.set({
			observationStatus: LabObservationStatusEnum.VERIFIED,
			verifiedAt: now,
			verifiedBy: input.staffId,
			updatedAt: now
		})
		.where(eq(table.labResultObservationTable.reportId, report.id));

	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.VERIFIED,
			updatedAt: now
		})
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		);
}

export async function releaseReport(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
}) {
	const setting = await getOrCreateHospitalLabSetting(input.hospitalId);
	const now = new Date().toISOString();
	const report = await getReportForAccession(input.accessionId);
	if (!report) throw error(404, 'Report not found');

	const [acc] = await ensureDb()
		.select({
			accession: table.labAccessionTable,
			visitId: table.labOrderTable.visitId,
			patientId: table.labOrderTable.patientId,
			serviceOrderDetailId: table.labOrderTable.serviceOrderDetailId
		})
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!acc) throw error(404, 'Accession not found');

	const observations = await ensureDb()
		.select()
		.from(table.labResultObservationTable)
		.where(eq(table.labResultObservationTable.reportId, report.id));

	for (const obs of observations) {
		if (obs.isCritical) {
			if (
				setting.criticalPolicy ===
				LabCriticalPolicyEnum.CALLBACK_BEFORE_RELEASE
			) {
				const [cb] = await ensureDb()
					.select()
					.from(table.labCriticalCallbackTable)
					.where(
						and(
							eq(table.labCriticalCallbackTable.observationId, obs.id),
							eq(table.labCriticalCallbackTable.callbackStatus, 'completed')
						)
					)
					.limit(1);
				if (!cb) {
					throw error(
						400,
						'Critical callback must be completed before release'
					);
				}
			}
		}
	}

	await ensureDb()
		.update(table.labResultReportTable)
		.set({
			reportStatus: LabResultReportStatusEnum.FINAL,
			releasedAt: now,
			releasedBy: input.staffId,
			updatedAt: now
		})
		.where(eq(table.labResultReportTable.id, report.id));

	await ensureDb()
		.update(table.labResultObservationTable)
		.set({
			observationStatus: LabObservationStatusEnum.RELEASED,
			updatedAt: now
		})
		.where(eq(table.labResultObservationTable.reportId, report.id));

	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.RELEASED,
			updatedAt: now
		})
		.where(eq(table.labAccessionTable.id, input.accessionId));

	// Legacy lab_result summary for chart compatibility
	const summaryLines = observations.map((o) => {
		const val = o.valueText ?? o.valueNumeric ?? '';
		return `${val}${o.unit ? ` ${o.unit}` : ''}${o.isCritical ? ' [CRITICAL]' : ''}`;
	});
	const resultText = summaryLines.join('\n');
	const isCritical = observations.some((o) => o.isCritical);

	await ensureDb().insert(table.labResultTable).values({
		hospitalId: input.hospitalId,
		visitId: acc.visitId,
		serviceOrderDetailId: acc.serviceOrderDetailId,
		resultText,
		resultJson: JSON.stringify({ accessionId: input.accessionId, observations }),
		isCritical,
		enteredBy: input.staffId,
		endorsedAt: now,
		endorsedBy: input.staffId
	});

	if (setting.autoNursingCompleteOnRelease) {
		await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set({ nursingCompleteTime: now })
			.where(
				eq(table.serviceOrderDetailTable.id, acc.serviceOrderDetailId)
			);
	}

	for (const obs of observations) {
		if (obs.isCritical) {
			await ensureCriticalCallbackForObservation({
				hospitalId: input.hospitalId,
				observationId: obs.id,
				visitId: acc.visitId,
				patientId: acc.patientId,
				staffId: input.staffId
			});
		}
	}

	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_accession',
		entityId: input.accessionId,
		action: 'released',
		staffId: input.staffId
	});
}

export async function listReleasedResultsForVisit(input: {
	hospitalId: string;
	visitId: string;
}) {
	const rows = await ensureDb()
		.select({
			accession: table.labAccessionTable,
			releasedAt: table.labResultReportTable.releasedAt,
			serviceName: table.serviceItemTable.serviceName
		})
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.labResultReportTable,
			eq(table.labResultReportTable.accessionId, table.labAccessionTable.id)
		)
		.innerJoin(
			table.serviceOrderDetailTable,
			eq(table.labOrderTable.serviceOrderDetailId, table.serviceOrderDetailTable.id)
		)
		.innerJoin(
			table.serviceItemTable,
			eq(table.serviceOrderDetailTable.serviceId, table.serviceItemTable.id)
		)
		.where(
			and(
				eq(table.labOrderTable.hospitalId, input.hospitalId),
				eq(table.labOrderTable.visitId, input.visitId),
				eq(
					table.labAccessionTable.accessionStatus,
					LabAccessionStatusEnum.RELEASED
				)
			)
		)
		.orderBy(desc(table.labResultReportTable.releasedAt));

	const out = [];
	for (const row of rows) {
		const report = await getReportForAccession(row.accession.id);
		if (!report) continue;
		const observations = await ensureDb()
			.select({
				obs: table.labResultObservationTable,
				testCode: table.labTestTable.code,
				testName: table.labTestTable.name
			})
			.from(table.labResultObservationTable)
			.innerJoin(
				table.labTestTable,
				eq(table.labResultObservationTable.testId, table.labTestTable.id)
			)
			.where(eq(table.labResultObservationTable.reportId, report.id));

		out.push({
			accessionId: row.accession.id,
			accessionNo: row.accession.accessionNo,
			releasedAt: row.releasedAt,
			section: row.accession.section,
			serviceName: row.serviceName,
			observations: observations.map((o) => ({
				id: o.obs.id,
				reportId: o.obs.reportId,
				testId: o.obs.testId,
				testCode: o.testCode,
				testName: o.testName,
				valueNumeric: o.obs.valueNumeric,
				valueText: o.obs.valueText,
				unit: o.obs.unit,
				refRangeText: o.obs.refRangeText,
				abnormalFlag: o.obs.abnormalFlag,
				isCritical: o.obs.isCritical,
				observationStatus: o.obs.observationStatus
			}))
		});
	}
	return out;
}
