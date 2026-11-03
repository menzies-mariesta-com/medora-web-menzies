import { error } from '@sveltejs/kit';
import {
	IpdAdmissionStatusEnum,
	StatusEnum,
	VisitStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, ne } from 'drizzle-orm';

const MAX_SOURCE_CHAIN_DEPTH = 10;

export async function assertValidSourceVisit(input: {
	hospitalId: string;
	patientId: string;
	sourceVisitId: string;
	db?: ReturnType<typeof ensureDb>;
}): Promise<void> {
	const db = input.db ?? ensureDb();
	const sourceId = input.sourceVisitId.trim();
	if (!sourceId) {
		throw error(400, 'Source visit is required');
	}

	const [src] = await db
		.select({
			id: table.patientVisitTable.id,
			patientId: table.patientVisitTable.patientId,
			hospitalId: table.patientVisitTable.hospitalId,
			statusId: table.patientVisitTable.statusId,
			statusTaggingId: table.patientVisitTable.statusTaggingId,
			sourceVisitId: table.patientVisitTable.sourceVisitId
		})
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, sourceId))
		.limit(1);

	if (!src || src.statusId === StatusEnum.DELETED) {
		throw error(400, 'Source visit not found');
	}
	if (src.hospitalId !== input.hospitalId) {
		throw error(400, 'Source visit belongs to another hospital');
	}
	if (src.patientId !== input.patientId) {
		throw error(400, 'Source visit belongs to another patient');
	}
	if (src.statusTaggingId === VisitStatusTaggingEnum.CLOSED_DISCHARGED) {
		throw error(
			400,
			'Source visit is already closed; choose another or admit directly'
		);
	}

	let cursor: string | null = src.sourceVisitId;
	const guard = new Set<string>([sourceId]);
	let depth = 0;
	while (cursor != null && depth < MAX_SOURCE_CHAIN_DEPTH) {
		if (guard.has(cursor)) {
			throw error(400, 'Invalid source visit chain (cycle)');
		}
		guard.add(cursor);
		const [parent] = await db
			.select({ sourceVisitId: table.patientVisitTable.sourceVisitId })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, cursor))
			.limit(1);
		cursor = parent?.sourceVisitId ?? null;
		depth += 1;
	}
}

/** Active IPD admission whose visit was converted from `sourceVisitId`. */
export async function findActiveAdmissionForSourceVisit(
	sourceVisitId: string,
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<{ admissionId: number; ipdVisitId: string } | null> {
	const [row] = await db
		.select({
			admissionId: table.ipdAdmissionTable.id,
			ipdVisitId: table.ipdAdmissionTable.visitId
		})
		.from(table.ipdAdmissionTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.sourceVisitId, sourceVisitId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) return null;
	return {
		admissionId: row.admissionId,
		ipdVisitId: row.ipdVisitId
	};
}
