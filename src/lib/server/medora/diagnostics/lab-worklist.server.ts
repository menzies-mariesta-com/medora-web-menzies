import { LabAccessionStatusEnum } from '$lib/model/enum/diagnostics.enum';
import type { LabDashboardStats } from '$lib/model/type/medora/diagnostics.type';
import { and, count, eq, inArray, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	listAccessionsForWorklist,
	listCollectionWorklist,
	listReceiveWorklist
} from './lab-accession.server';

const BENCH_STATUSES = [
	LabAccessionStatusEnum.RECEIVED,
	LabAccessionStatusEnum.IN_PROCESS,
	LabAccessionStatusEnum.RESULTED,
	LabAccessionStatusEnum.VERIFIED
];

export async function listSectionWorklist(input: {
	hospitalId: string;
	section: string;
}) {
	return listAccessionsForWorklist({
		hospitalId: input.hospitalId,
		section: input.section,
		statuses: BENCH_STATUSES
	});
}

export { listCollectionWorklist, listReceiveWorklist };

export async function getLabDashboardStats(
	hospitalId: string
): Promise<LabDashboardStats> {
	const db = ensureDb();
	const base = eq(table.labAccessionTable.hospitalId, hospitalId);

	const [[pendingCollection], [pendingReceive], [inProcess], [unverified], [openCritical]] =
		await Promise.all([
			db
				.select({ c: count() })
				.from(table.labAccessionTable)
				.where(
					and(
						base,
						inArray(table.labAccessionTable.accessionStatus, [
							LabAccessionStatusEnum.ORDERED,
							LabAccessionStatusEnum.COLLECTION_SCHEDULED
						])
					)
				),
			db
				.select({ c: count() })
				.from(table.labAccessionTable)
				.where(
					and(
						base,
						inArray(table.labAccessionTable.accessionStatus, [
							LabAccessionStatusEnum.COLLECTED,
							LabAccessionStatusEnum.IN_TRANSIT
						])
					)
				),
			db
				.select({ c: count() })
				.from(table.labAccessionTable)
				.where(
					and(
						base,
						eq(
							table.labAccessionTable.accessionStatus,
							LabAccessionStatusEnum.IN_PROCESS
						)
					)
				),
			db
				.select({ c: count() })
				.from(table.labAccessionTable)
				.where(
					and(
						base,
						inArray(table.labAccessionTable.accessionStatus, [
							LabAccessionStatusEnum.RESULTED,
							LabAccessionStatusEnum.VERIFIED
						])
					)
				),
			db
				.select({ c: count() })
				.from(table.labCriticalCallbackTable)
				.where(
					and(
						eq(table.labCriticalCallbackTable.hospitalId, hospitalId),
						eq(table.labCriticalCallbackTable.callbackStatus, 'open'),
						ne(table.labCriticalCallbackTable.statusId, StatusEnum.DELETED)
					)
				)
		]);

	return {
		pendingCollection: pendingCollection?.c ?? 0,
		pendingReceive: pendingReceive?.c ?? 0,
		inProcess: inProcess?.c ?? 0,
		unverified: unverified?.c ?? 0,
		openCriticalCallbacks: openCritical?.c ?? 0
	};
}
