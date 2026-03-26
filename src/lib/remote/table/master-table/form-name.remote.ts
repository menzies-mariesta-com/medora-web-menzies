import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	FormNameSchema,
	FormNameSchemaInsert,
	FormNameSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getFormName = query(
	async (): Promise<FormNameSchema[]> => {
		return ensureDb()
			.select()
			.from(table.formNameTable)
			.where(ne(table.formNameTable.statusId, StatusEnum.DELETED))
			.orderBy(table.formNameTable.code);
	}
);

export const getFormNameByFormType = query(
	'unchecked' as const,
	async (params: { formType: string }): Promise<FormNameSchema[]> => {
		const term = params.formType.trim();
		if (!term) return [];
		return ensureDb()
			.select()
			.from(table.formNameTable)
			.where(
				and(
					eq(table.formNameTable.formType, term),
					ne(table.formNameTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(table.formNameTable.code);
	}
);

export const getFormNameCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.formNameTable)
		.where(ne(table.formNameTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getFormNamePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<FormNameSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.formNameTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.formNameTable)
				.where(notDeletedFilter)
				.orderBy(table.formNameTable.code)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.formNameTable)
				.where(notDeletedFilter)
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

export const getFormNameById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<FormNameSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.formNameTable)
			.where(
				and(
					eq(table.formNameTable.id, id),
					ne(table.formNameTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const getFormNameByCode = query(
	'unchecked' as const,
	async ({
		code
	}: {
		code: string;
	}): Promise<FormNameSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.formNameTable)
			.where(
				and(
					eq(table.formNameTable.code, code.trim()),
					ne(table.formNameTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createFormName = command(
	'unchecked' as const,
	async (payload: FormNameSchemaInsert): Promise<FormNameSchema> => {
		const [row] = await ensureDb()
			.insert(table.formNameTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getFormName().refresh();
		return row;
	}
);

export const updateFormName = command(
	'unchecked' as const,
	async (
		payload: {
			id: number;
		} & FormNameSchemaUpdate
	): Promise<FormNameSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.formNameTable)
			.set(rest)
			.where(eq(table.formNameTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getFormName().refresh();
		getFormNameById({ id }).refresh();
		return row;
	}
);

export const deleteFormName = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.formNameTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.formNameTable.id, id));
		getFormName().refresh();
		getFormNameById({ id }).refresh();
	}
);
