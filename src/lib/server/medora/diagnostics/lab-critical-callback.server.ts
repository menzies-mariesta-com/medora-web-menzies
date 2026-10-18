import { error } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { LabCriticalCallbackStatusEnum } from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { createClinicalAlert } from '$lib/server/medora/clinical/clinical-alert.server';

export async function ensureCriticalCallbackForObservation(input: {
	hospitalId: string;
	observationId: number;
	visitId: string;
	patientId: string;
	staffId?: string | null;
}) {
	const existing = await ensureDb()
		.select()
		.from(table.labCriticalCallbackTable)
		.where(eq(table.labCriticalCallbackTable.observationId, input.observationId))
		.limit(1);
	if (existing[0]) return existing[0];

	const [obs] = await ensureDb()
		.select({
			obs: table.labResultObservationTable,
			testName: table.labTestTable.name
		})
		.from(table.labResultObservationTable)
		.innerJoin(
			table.labTestTable,
			eq(table.labResultObservationTable.testId, table.labTestTable.id)
		)
		.where(eq(table.labResultObservationTable.id, input.observationId))
		.limit(1);
	if (!obs) throw error(404, 'Observation not found');

	const value =
		obs.obs.valueText ??
		(obs.obs.valueNumeric != null ? String(obs.obs.valueNumeric) : '');

	const [row] = await ensureDb()
		.insert(table.labCriticalCallbackTable)
		.values({
			hospitalId: input.hospitalId,
			observationId: input.observationId,
			visitId: input.visitId,
			patientId: input.patientId,
			callbackStatus: LabCriticalCallbackStatusEnum.OPEN
		})
		.returning();
	if (!row) throw error(500, 'Unable to create callback');

	await createClinicalAlert({
		hospitalId: input.hospitalId,
		patientId: input.patientId,
		visitId: input.visitId,
		ruleCode: 'LAB_CRITICAL',
		severity: 'error',
		title: 'Critical lab result',
		message: `Critical ${obs.testName}: ${value}`,
		payloadJson: {
			callbackId: row.id,
			observationId: input.observationId,
			link: `/medora/hospital/${input.hospitalId}/home/diagnostics/lab/critical-callback`
		}
	});

	return row;
}

export async function listOpenCriticalCallbacks(hospitalId: string) {
	return ensureDb()
		.select({
			callback: table.labCriticalCallbackTable,
			testName: table.labTestTable.name,
			valueNumeric: table.labResultObservationTable.valueNumeric,
			valueText: table.labResultObservationTable.valueText,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`
		})
		.from(table.labCriticalCallbackTable)
		.innerJoin(
			table.labResultObservationTable,
			eq(
				table.labCriticalCallbackTable.observationId,
				table.labResultObservationTable.id
			)
		)
		.innerJoin(
			table.labTestTable,
			eq(table.labResultObservationTable.testId, table.labTestTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.labCriticalCallbackTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.labCriticalCallbackTable.hospitalId, hospitalId),
				ne(
					table.labCriticalCallbackTable.callbackStatus,
					LabCriticalCallbackStatusEnum.COMPLETED
				),
				ne(table.labCriticalCallbackTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(table.labCriticalCallbackTable.createdAt);
}

export async function completeCriticalCallback(input: {
	hospitalId: string;
	callbackId: number;
	staffId: string;
	calledParty: string;
	readBackText: string;
}) {
	const now = new Date().toISOString();
	const [row] = await ensureDb()
		.update(table.labCriticalCallbackTable)
		.set({
			callbackStatus: LabCriticalCallbackStatusEnum.COMPLETED,
			calledParty: input.calledParty,
			readBackText: input.readBackText,
			calledAt: now,
			completedAt: now,
			completedBy: input.staffId,
			updatedAt: now
		})
		.where(
			and(
				eq(table.labCriticalCallbackTable.id, input.callbackId),
				eq(table.labCriticalCallbackTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Callback not found');
	return row;
}
