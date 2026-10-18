import { error } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	BillingStatusTaggingEnum,
	StatusEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import { releaseErBedOnEdDischarge } from './er-bed-assignment.server';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-sse.server';
import { PerioperativeSseEventTypeEnum } from '$lib/model/enum/perioperative.enum';

export async function dischargeEdEncounter(input: {
	hospitalId: string;
	visitId: string;
	dischargeRemarks?: string | null;
	retainErBedAfterDischarge: boolean;
	dischargedAt?: string | null;
}): Promise<typeof table.edEncounterTable.$inferSelect> {
	const [visit] = await ensureDb()
		.select({
			visitTypeId: table.patientVisitTable.visitTypeId
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
	if (visit.visitTypeId !== VisitTypeEnum.ED) {
		throw error(400, 'Visit is not an ED visit');
	}

	const [closedBill] = await ensureDb()
		.select({ id: table.opBillingTable.id })
		.from(table.opBillingTable)
		.where(
			and(
				eq(table.opBillingTable.visitId, input.visitId),
				eq(table.opBillingTable.hospitalId, input.hospitalId),
				eq(
					table.opBillingTable.statusTaggingId,
					BillingStatusTaggingEnum.CLOSED
				),
				ne(table.opBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!closedBill) {
		throw error(400, 'ER bill must be closed before discharge');
	}

	const dischargedAt =
		input.dischargedAt?.trim() || new Date().toISOString();

	const [row] = await ensureDb()
		.update(table.edEncounterTable)
		.set({
			boardColumn: EdBoardColumnEnum.DISCHARGED,
			dischargedAt,
			dischargeRemarks: input.dischargeRemarks?.trim() || null,
			retainErBedAfterDischarge: input.retainErBedAfterDischarge,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'ED encounter not found');

	if (!input.retainErBedAfterDischarge) {
		await releaseErBedOnEdDischarge({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			boardColumn: EdBoardColumnEnum.DISCHARGED
		});
	}

	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.ED_BOARD,
		hospitalId: input.hospitalId,
		data: {
			visitId: input.visitId,
			boardColumn: EdBoardColumnEnum.DISCHARGED
		}
	});

	return row;
}
