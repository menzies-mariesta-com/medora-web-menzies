import { and, eq } from 'drizzle-orm';
import { ClinicalAlertStatusEnum } from '$lib/model/enum/clinical-platform.enum';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listOpenClinicalAlerts(input: {
	hospitalId: string;
	staffId?: string;
}) {
	const conditions = [
		eq(table.clinicalAlertTable.hospitalId, input.hospitalId),
		eq(
			table.clinicalAlertTable.alertStatus,
			ClinicalAlertStatusEnum.OPEN
		)
	];
	if (input.staffId) {
		conditions.push(
			eq(table.clinicalAlertTable.assignedStaffId, input.staffId)
		);
	}
	return ensureDb()
		.select()
		.from(table.clinicalAlertTable)
		.where(and(...conditions))
		.orderBy(table.clinicalAlertTable.createdAt);
}

export async function createClinicalAlert(input: {
	hospitalId: string;
	patientId: string;
	visitId?: string | null;
	ruleCode: string;
	severity: string;
	title: string;
	message: string;
	assignedStaffId?: string | null;
	payloadJson?: Record<string, unknown>;
}) {
	const [row] = await ensureDb()
		.insert(table.clinicalAlertTable)
		.values({
			hospitalId: input.hospitalId,
			patientId: input.patientId,
			visitId: input.visitId ?? null,
			ruleCode: input.ruleCode,
			severity: input.severity,
			title: input.title,
			message: input.message,
			payloadJson: input.payloadJson ?? {},
			assignedStaffId: input.assignedStaffId ?? null
		})
		.returning();
	if (row && input.assignedStaffId) {
		await ensureDb().insert(table.notificationTable).values({
			recipientStaffId: input.assignedStaffId,
			hospitalId: input.hospitalId,
			eventType: 'CLINICAL_ALERT',
			severity:
				input.severity === 'error'
					? StatusColorEnum.ERROR
					: StatusColorEnum.WARNING,
			message: input.message,
			title: input.title,
			visitId: input.visitId ?? null,
			link: `/medora/hospital/${input.hospitalId}/home/clinical-tasks/alerts`
		});
	}
	return row;
}

export async function acknowledgeClinicalAlert(input: {
	hospitalId: string;
	alertId: number;
	staffId: string;
}) {
	await ensureDb()
		.update(table.clinicalAlertTable)
		.set({
			alertStatus: ClinicalAlertStatusEnum.ACKNOWLEDGED,
			acknowledgedAt: new Date(),
			acknowledgedBy: input.staffId
		})
		.where(
			and(
				eq(table.clinicalAlertTable.id, input.alertId),
				eq(table.clinicalAlertTable.hospitalId, input.hospitalId)
			)
		);
}

/** VTE prophylaxis gap: call after IPD admission when no VTE order within window. */
export async function evaluateVteProphylaxisGap(input: {
	hospitalId: string;
	visitId: string;
	patientId: string;
	assignStaffId: string;
}) {
	await createClinicalAlert({
		hospitalId: input.hospitalId,
		patientId: input.patientId,
		visitId: input.visitId,
		ruleCode: 'VTE_PROPHYLAXIS',
		severity: 'warning',
		title: 'VTE prophylaxis review',
		message:
			'No VTE prophylaxis order documented within the expected window.',
		assignedStaffId: input.assignStaffId
	});
}
