import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	BillingDiscountTypeSchema,
	BillingDiscountTypeSchemaInsert,
	BillingDiscountTypeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, asc, count, eq, ne } from 'drizzle-orm';

const notDeleted = ne(
	table.billingDiscountTypeTable.statusId,
	StatusEnum.DELETED
);

/** Active rows — use for OP billing discount type dropdowns. */
export const getBillingDiscountType = query(
	async (): Promise<BillingDiscountTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.billingDiscountTypeTable)
			.where(notDeleted)
			.orderBy(asc(table.billingDiscountTypeTable.id));
	}
);

export const getBillingDiscountTypeCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.billingDiscountTypeTable)
			.where(notDeleted);
		return row?.count ?? 0;
	}
);

export const getBillingDiscountTypePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<BillingDiscountTypeSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.billingDiscountTypeTable)
				.where(notDeleted)
				.orderBy(asc(table.billingDiscountTypeTable.id))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.billingDiscountTypeTable)
				.where(notDeleted)
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

export const getBillingDiscountTypeById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<BillingDiscountTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.billingDiscountTypeTable)
			.where(
				and(
					eq(table.billingDiscountTypeTable.id, id),
					notDeleted
				)
			);
		return row ?? null;
	}
);

export const getBillingDiscountTypeByCode = query(
	'unchecked' as const,
	async ({
		code
	}: {
		code: string;
	}): Promise<BillingDiscountTypeSchema | null> => {
		const trimmed = code.trim();
		if (!trimmed) return null;
		const [row] = await ensureDb()
			.select()
			.from(table.billingDiscountTypeTable)
			.where(
				and(
					eq(table.billingDiscountTypeTable.code, trimmed),
					notDeleted
				)
			);
		return row ?? null;
	}
);

export const createBillingDiscountType = command(
	'unchecked' as const,
	async (
		payload: BillingDiscountTypeSchemaInsert
	): Promise<BillingDiscountTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.billingDiscountTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getBillingDiscountType().refresh();
		getBillingDiscountTypeCount().refresh();
		getBillingDiscountTypePaginated(undefined).refresh();
		return row;
	}
);

export const updateBillingDiscountType = command(
	'unchecked' as const,
	async (
		payload: BillingDiscountTypeSchemaUpdate & { id: number }
	): Promise<BillingDiscountTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.billingDiscountTypeTable)
			.set(rest as BillingDiscountTypeSchemaUpdate)
			.where(eq(table.billingDiscountTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getBillingDiscountType().refresh();
		getBillingDiscountTypeCount().refresh();
		getBillingDiscountTypePaginated(undefined).refresh();
		return row;
	}
);

export const deleteBillingDiscountType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.billingDiscountTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.billingDiscountTypeTable.id, id));
		getBillingDiscountType().refresh();
		getBillingDiscountTypeCount().refresh();
		getBillingDiscountTypePaginated(undefined).refresh();
	}
);

export const deleteBillingDiscountTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.billingDiscountTypeTable)
			.where(eq(table.billingDiscountTypeTable.id, id));
		getBillingDiscountType().refresh();
		getBillingDiscountTypeCount().refresh();
		getBillingDiscountTypePaginated(undefined).refresh();
	}
);
