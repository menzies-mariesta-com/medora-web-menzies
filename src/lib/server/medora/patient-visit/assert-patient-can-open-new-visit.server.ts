import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import {
	BillingStatusTaggingEnum,
	StatusEnum,
	VisitStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

/**
 * Block opening a new visit when the patient still has an unfinished visit
 * or any open OP/IP billing header at this hospital.
 */
export async function assertPatientCanOpenNewVisit(input: {
	hospitalId: string;
	patientId: string;
}): Promise<void> {
	const db = ensureDb();

	const unfinishedVisits = await db
		.select({
			id: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				eq(table.patientVisitTable.patientId, input.patientId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
				ne(
					table.patientVisitTable.statusTaggingId,
					VisitStatusTaggingEnum.CLOSED_DISCHARGED
				)
			)
		)
		.limit(1);

	if (unfinishedVisits[0]) {
		const label = unfinishedVisits[0].visitNo ?? `#${unfinishedVisits[0].id}`;
		throw error(
			400,
			`Cannot open a new visit: patient has unfinished visit ${label}. Close or discharge it first.`
		);
	}

	const visitIds = await db
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				eq(table.patientVisitTable.patientId, input.patientId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		);

	const ids = visitIds.map((v) => v.id);
	if (ids.length === 0) return;

	const [openOp] = await db
		.select({
			visitId: table.opBillingTable.visitId,
			billNo: table.opBillingTable.billNo
		})
		.from(table.opBillingTable)
		.where(
			and(
				inArray(table.opBillingTable.visitId, ids),
				eq(
					table.opBillingTable.statusTaggingId,
					BillingStatusTaggingEnum.OPEN
				),
				ne(table.opBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (openOp) {
		const [v] = await db
			.select({ visitNo: table.patientVisitTable.visitNo })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, openOp.visitId))
			.limit(1);
		const label = v?.visitNo ?? `#${openOp.visitId}`;
		throw error(
			400,
			`Cannot open a new visit: patient has an open OP bill on visit ${label}. Close the bill first.`
		);
	}

	const [openIp] = await db
		.select({
			visitId: table.ipBillingTable.visitId,
			billNo: table.ipBillingTable.billNo
		})
		.from(table.ipBillingTable)
		.where(
			and(
				inArray(table.ipBillingTable.visitId, ids),
				eq(
					table.ipBillingTable.statusTaggingId,
					BillingStatusTaggingEnum.OPEN
				),
				ne(table.ipBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (openIp) {
		const [v] = await db
			.select({ visitNo: table.patientVisitTable.visitNo })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, openIp.visitId))
			.limit(1);
		const label = v?.visitNo ?? `#${openIp.visitId}`;
		throw error(
			400,
			`Cannot open a new visit: patient has an open IP bill on visit ${label}. Close the bill first.`
		);
	}
}
