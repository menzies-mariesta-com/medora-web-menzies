import { query, command } from '$app/server';
import { db, ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	OpBillingLineSchema,
	OpBillingLineSchemaInsert,
	OpBillingLineSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, asc, count, eq, isNull } from 'drizzle-orm';

const notLineDeleted = isNull(table.opBillingLineTable.deletedAt);

/** Active OP billing lines (excludes soft-deleted rows). */
export const getOpBillingLine = query(
	'unchecked' as const,
	async (params?: {
		opBillingId?: number | null;
		serviceId?: number | null;
		serviceOrderDetailId?: number | null;
		id?: number | null;
	}): Promise<OpBillingLineSchema[]> => {
		let whereExpr = notLineDeleted;

		if (params?.opBillingId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.opBillingId, params.opBillingId)
			) as typeof whereExpr;
		}
		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}
		if (params?.serviceOrderDetailId != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.opBillingLineTable.serviceOrderDetailId,
					params.serviceOrderDetailId
				)
			) as typeof whereExpr;
		}
		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.id, params.id)
			) as typeof whereExpr;
		}

		return ensureDb()
			.select()
			.from(table.opBillingLineTable)
			.where(whereExpr)
			.orderBy(asc(table.opBillingLineTable.lineIndex));
	}
);

export const getOpBillingLineCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.opBillingLineTable)
		.where(notLineDeleted);
	return row?.count ?? 0;
});

export const getOpBillingLinePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			opBillingId?: number | null;
			serviceId?: number | null;
			serviceOrderDetailId?: number | null;
			id?: number | null;
		}
	): Promise<PaginatedResult<OpBillingLineSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		let whereExpr = notLineDeleted;

		if (params?.opBillingId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.opBillingId, params.opBillingId)
			) as typeof whereExpr;
		}
		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}
		if (params?.serviceOrderDetailId != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.opBillingLineTable.serviceOrderDetailId,
					params.serviceOrderDetailId
				)
			) as typeof whereExpr;
		}
		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingLineTable.id, params.id)
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.opBillingLineTable)
				.where(whereExpr)
				.orderBy(asc(table.opBillingLineTable.lineIndex))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.opBillingLineTable)
				.where(whereExpr)
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
);

export const getOpBillingLineById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<OpBillingLineSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.opBillingLineTable)
			.where(
				and(
					eq(table.opBillingLineTable.id, id),
					notLineDeleted
				)
			);
		return row ?? null;
	}
);

export const createOpBillingLine = command(
	'unchecked' as const,
	async (
		payload: OpBillingLineSchemaInsert
	): Promise<OpBillingLineSchema> => {
		const [row] = await ensureDb()
			.insert(table.opBillingLineTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getOpBillingLine(undefined).refresh();
		getOpBillingLineCount().refresh();
		getOpBillingLinePaginated(undefined).refresh();
		return row;
	}
);

export const updateOpBillingLine = command(
	'unchecked' as const,
	async (
		payload: OpBillingLineSchemaUpdate & { id: number }
	): Promise<OpBillingLineSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.opBillingLineTable)
			.set(rest as OpBillingLineSchemaUpdate)
			.where(eq(table.opBillingLineTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getOpBillingLine(undefined).refresh();
		getOpBillingLineCount().refresh();
		getOpBillingLinePaginated(undefined).refresh();
		return row;
	}
);

/** Soft-delete a line (`deleted_at` / audit) via audited `ensureDb()`. */
export const deleteOpBillingLine = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.opBillingLineTable)
			.where(eq(table.opBillingLineTable.id, id));
		getOpBillingLine(undefined).refresh();
		getOpBillingLineCount().refresh();
		getOpBillingLinePaginated(undefined).refresh();
	}
);

/** Hard-delete (bypasses soft-delete proxy; use rarely). */
export const deleteOpBillingLineComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		if (!db) throw new Error('DATABASE_URL is not set');
		await db
			.delete(table.opBillingLineTable)
			.where(eq(table.opBillingLineTable.id, id));
		getOpBillingLine(undefined).refresh();
		getOpBillingLineCount().refresh();
		getOpBillingLinePaginated(undefined).refresh();
	}
);
