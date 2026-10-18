import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import {
	BillingStatusTaggingEnum,
	StatusEnum,
	VisitStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

/**
 * Block opening a new visit when the patient still has an unfinished visit
 * or any open OP/IP billing header at this hospital.
 *
 * ADT OPD→IPD conversion: pass `convertFromOpdVisitId` to allow that OPD visit
 * (and an open OP bill on it only) while still blocking other unfinished visits,
 * open IP bills, and open OP bills on other visits.
 */
export async function assertPatientCanOpenNewVisit(input: {
	hospitalId: string;
	patientId: string;
	/** Unfinished OPD visit being converted to IPD via ADT Admission */
	convertFromOpdVisitId?: string;
}): Promise<void> {
	const db = ensureDb();
	const convertId =
		typeof input.convertFromOpdVisitId === 'string' &&
		input.convertFromOpdVisitId.trim() !== ''
			? input.convertFromOpdVisitId.trim()
			: undefined;

	if (convertId != null) {
		const [src] = await db
			.select({
				id: table.patientVisitTable.id,
				patientId: table.patientVisitTable.patientId,
				hospitalId: table.patientVisitTable.hospitalId,
				visitTypeId: table.patientVisitTable.visitTypeId,
				statusTaggingId: table.patientVisitTable.statusTaggingId,
				statusId: table.patientVisitTable.statusId
			})
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, convertId))
			.limit(1);
		if (!src || src.statusId === StatusEnum.DELETED) {
			throw error(400, 'Source OPD visit not found');
		}
		if (src.hospitalId !== input.hospitalId) {
			throw error(400, 'Source OPD visit belongs to another hospital');
		}
		if (src.patientId !== input.patientId) {
			throw error(400, 'Source OPD visit belongs to another patient');
		}
		if (src.visitTypeId !== VisitTypeEnum.OPD) {
			throw error(400, 'Source visit must be an OPD visit');
		}
		if (src.statusTaggingId === VisitStatusTaggingEnum.CLOSED_DISCHARGED) {
			throw error(
				400,
				'Source OPD visit is already closed; choose another or admit directly'
			);
		}
	}

	const unfinishedWhere = [
		eq(table.patientVisitTable.hospitalId, input.hospitalId),
		eq(table.patientVisitTable.patientId, input.patientId),
		ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
		ne(
			table.patientVisitTable.statusTaggingId,
			VisitStatusTaggingEnum.CLOSED_DISCHARGED
		)
	];
	if (convertId != null) {
		unfinishedWhere.push(ne(table.patientVisitTable.id, convertId));
	}

	const unfinishedVisits = await db
		.select({
			id: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.patientVisitTable)
		.where(and(...unfinishedWhere))
		.limit(1);

	if (unfinishedVisits[0]) {
		const label =
			unfinishedVisits[0].visitNo ?? `#${unfinishedVisits[0].id}`;
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

	const opBillVisitIds =
		convertId != null
			? ids.filter((id) => id !== convertId)
			: ids;

	if (opBillVisitIds.length > 0) {
		const [openOp] = await db
			.select({
				visitId: table.opBillingTable.visitId,
				billNo: table.opBillingTable.billNo
			})
			.from(table.opBillingTable)
			.where(
				and(
					inArray(table.opBillingTable.visitId, opBillVisitIds),
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
