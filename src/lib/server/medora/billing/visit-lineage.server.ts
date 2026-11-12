import { error } from '@sveltejs/kit';
import {
	IpdAdmissionStatusEnum,
	StatusEnum,
	VisitStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, inArray, ne } from 'drizzle-orm';

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

/**
 * Visit ids in the same conversion chain: ancestors via `source_visit_id`,
 * descendants that point at any id in the chain (same patient).
 */
export async function listSourceLinkedVisitIds(input: {
	hospitalId: string;
	visitId: string;
	db?: ReturnType<typeof ensureDb>;
}): Promise<string[]> {
	const db = input.db ?? ensureDb();
	const visitId = input.visitId.trim();
	const hospitalId = input.hospitalId.trim();
	if (!visitId || !hospitalId) return visitId ? [visitId] : [];

	const [seed] = await db
		.select({
			patientId: table.patientVisitTable.patientId,
			sourceVisitId: table.patientVisitTable.sourceVisitId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!seed) return [visitId];

	const ids = new Set<string>([visitId]);
	let cursor: string | null = seed.sourceVisitId;
	let depth = 0;
	while (cursor && depth < MAX_SOURCE_CHAIN_DEPTH) {
		if (ids.has(cursor)) break;
		ids.add(cursor);
		const [parent] = await db
			.select({ sourceVisitId: table.patientVisitTable.sourceVisitId })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, cursor),
					eq(table.patientVisitTable.patientId, seed.patientId),
					ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
				)
			)
			.limit(1);
		cursor = parent?.sourceVisitId ?? null;
		depth += 1;
	}

	let frontier = [...ids];
	for (
		let pass = 0;
		pass < MAX_SOURCE_CHAIN_DEPTH && frontier.length > 0;
		pass += 1
	) {
		const children = await db
			.select({ id: table.patientVisitTable.id })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.hospitalId, hospitalId),
					eq(table.patientVisitTable.patientId, seed.patientId),
					ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
					inArray(table.patientVisitTable.sourceVisitId, frontier)
				)
			);
		const next: string[] = [];
		for (const c of children) {
			if (!ids.has(c.id)) {
				ids.add(c.id);
				next.push(c.id);
			}
		}
		frontier = next;
	}

	return [...ids];
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
