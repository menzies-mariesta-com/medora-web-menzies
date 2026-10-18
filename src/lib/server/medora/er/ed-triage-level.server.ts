import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	EdTriageLevelSchema,
	EdTriageLevelSchemaInsert,
	EdTriageLevelSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, eq, ilike, ne } from 'drizzle-orm';

export async function getEdTriageLevelPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<EdTriageLevelRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.edTriageLevelTable.hospitalId, params.hospitalId),
		ne(table.edTriageLevelTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.edTriageLevelTable.name, `%${nameFilter}%`)
		);
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.edTriageLevelTable.statusId, params.statusId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.edTriageLevelTable)
			.where(whereClause)
			.orderBy(asc(table.edTriageLevelTable.level))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.edTriageLevelTable)
			.where(whereClause)
	]);
	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function listActiveEdTriageLevels(input: {
	hospitalId: string;
}): Promise<EdTriageLevelSchema[]> {
	return ensureDb()
		.select()
		.from(table.edTriageLevelTable)
		.where(
			and(
				eq(table.edTriageLevelTable.hospitalId, input.hospitalId),
				eq(table.edTriageLevelTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(asc(table.edTriageLevelTable.level));
}

export async function getEdTriageLevelById(input: {
	id: number;
	hospitalId: string;
}): Promise<EdTriageLevelSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.edTriageLevelTable)
		.where(
			and(
				eq(table.edTriageLevelTable.id, input.id),
				eq(table.edTriageLevelTable.hospitalId, input.hospitalId),
				ne(table.edTriageLevelTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createEdTriageLevel(
	payload: EdTriageLevelSchemaInsert
): Promise<EdTriageLevelSchema> {
	if (payload.level < 1 || payload.level > 5) {
		throw error(400, 'Triage level must be between 1 and 5');
	}
	const [row] = await ensureDb()
		.insert(table.edTriageLevelTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateEdTriageLevel(payload: {
	id: number;
	hospitalId: string;
	level?: number;
	name?: string;
	color?: string;
	statusId?: number;
}): Promise<EdTriageLevelSchema> {
	const { id, hospitalId, ...rest } = payload;
	if (rest.level != null && (rest.level < 1 || rest.level > 5)) {
		throw error(400, 'Triage level must be between 1 and 5');
	}
	const [row] = await ensureDb()
		.update(table.edTriageLevelTable)
		.set(rest as EdTriageLevelSchemaUpdate)
		.where(
			and(
				eq(table.edTriageLevelTable.id, id),
				eq(table.edTriageLevelTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Triage level not found');
	return row;
}

export async function deleteEdTriageLevel(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.edTriageLevelTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.edTriageLevelTable.id, input.id),
				eq(table.edTriageLevelTable.hospitalId, input.hospitalId)
			)
		);
}

/** Sync denormalized acuityLevel string on encounter from master row. */
export async function acuityDisplayForTriageLevelId(
	edTriageLevelId: number | null | undefined
): Promise<string | null> {
	if (edTriageLevelId == null) return null;
	const [row] = await ensureDb()
		.select({ level: table.edTriageLevelTable.level })
		.from(table.edTriageLevelTable)
		.where(eq(table.edTriageLevelTable.id, edTriageLevelId))
		.limit(1);
	return row ? String(row.level) : null;
}
