import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	SpecializationSchema,
	SpecializationSchemaInsert,
	SpecializationSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getSpecialization = query(
	async (): Promise<SpecializationSchema[]> => {
		return ensureDb()
			.select()
			.from(table.specializationTable)
			.where(
				eq(table.specializationTable.statusId, StatusEnum.ACTIVE)
			)
			.orderBy(table.specializationTable.name);
	}
);

export const getSpecializationCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.specializationTable)
			.where(
				eq(table.specializationTable.statusId, StatusEnum.ACTIVE)
			);
		return row?.count ?? 0;
	}
);

export const getSpecializationPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<SpecializationSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const activeFilter = eq(
			table.specializationTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.specializationTable)
				.where(activeFilter)
				.orderBy(table.specializationTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.specializationTable)
				.where(activeFilter)
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

export const getSpecializationById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<SpecializationSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.specializationTable)
			.where(eq(table.specializationTable.id, id));
		return row ?? null;
	}
);

export const createSpecialization = command(
	'unchecked' as const,
	async (
		payload: SpecializationSchemaInsert
	): Promise<SpecializationSchema> => {
		const [row] = await ensureDb()
			.insert(table.specializationTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getSpecialization().refresh();
		return row;
	}
);

export const updateSpecialization = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
	}): Promise<SpecializationSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.specializationTable)
			.set(rest as SpecializationSchemaUpdate)
			.where(eq(table.specializationTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getSpecialization().refresh();
		return row;
	}
);

export const deleteSpecialization = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.specializationTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);

export const deleteSpecializationComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.specializationTable)
			.where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);
