import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AllergySchema,
	AllergySchemaInsert,
	AllergySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, desc, eq, ilike, ne } from 'drizzle-orm';

/** Get all active allergies from master (for dropdowns / linking to patient). */
export const getAllergies = query(
	async (): Promise<AllergySchema[]> => {
		return ensureDb()
			.select()
			.from(table.allergyTable)
			.where(ne(table.allergyTable.statusId, StatusEnum.DELETED))
			.orderBy(table.allergyTable.id);
	}
);

/** Get one allergy by id. */
export const getAllergyById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<AllergySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.allergyTable)
			.where(
				and(
					eq(table.allergyTable.id, id),
					ne(table.allergyTable.statusId, StatusEnum.DELETED)
				)
			)
			.limit(1);
		return row ?? null;
	}
);

/** Get allergies paginated with optional search, for search-select components. */
export const getAllergyPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<AllergySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const search = params?.search?.trim();

		let whereExpr = ne(
			table.allergyTable.statusId,
			StatusEnum.DELETED
		);
		if (search) {
			whereExpr = and(
				whereExpr,
				ilike(table.allergyTable.name, `%${search}%`)
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.allergyTable)
				.where(whereExpr)
				.orderBy(desc(table.allergyTable.id))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.allergyTable)
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

/** Create a new allergy in the master table.
 * Ensures there is no existing active allergy with the same name (case-insensitive).
 */
export const createAllergy = command(
	'unchecked' as const,
	async (payload: AllergySchemaInsert): Promise<AllergySchema> => {
		const name = payload.name?.trim();
		if (name) {
			const [existing] = await ensureDb()
				.select()
				.from(table.allergyTable)
				.where(
					and(
						ne(table.allergyTable.statusId, StatusEnum.DELETED),
						ilike(table.allergyTable.name, name)
					)
				)
				.limit(1);
			if (existing) {
				throw error(
					400,
					'An allergy with this name already exists in the master list.'
				);
			}
		}

		const [row] = await ensureDb()
			.insert(table.allergyTable)
			.values({ ...payload, name })
			.returning();
		if (!row) {
			throw error(400, 'Failed to create allergy.');
		}
		getAllergies().refresh();
		return row;
	}
);

/** Update an allergy in the master table. */
export const updateAllergy = command(
	'unchecked' as const,
	async (
		payload: { id: number } & AllergySchemaUpdate
	): Promise<AllergySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.allergyTable)
			.set(rest as AllergySchemaUpdate)
			.where(eq(table.allergyTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getAllergies().refresh();
		return row;
	}
);
