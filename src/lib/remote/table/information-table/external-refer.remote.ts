import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ExternalReferSchema,
	ExternalReferSchemaInsert,
	ExternalReferSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq, or, ilike, ne, and } from 'drizzle-orm';

// get all
export const getExternalRefer = query(async (): Promise<ExternalReferSchema[]> => {
	const data = await ensureDb().select().from(table.externalReferTable);
	return data;
});

// get count
export const getExternalReferCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.externalReferTable);
	return row?.count ?? 0;
});

const externalReferWithRelationsWith = {
	referType: true,
	hospital: true,
	title: true,
	country: true,
	phoneCountry: true,
	state: true,
	city: true,
	postalCode: true,
	status: true,
} as const;

export type ExternalReferWithRelations = NonNullable<
	Awaited<ReturnType<typeof getExternalReferByIdWithRelations>>
>;

// get paginated with relations (optional search on name, address, phone, email)
export const getExternalReferPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<ExternalReferWithRelations>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const searchTerm = params?.search?.trim();
		const pattern = searchTerm ? `%${searchTerm}%` : null;
		const searchCondition =
			pattern &&
			or(
				ilike(table.externalReferTable.name, pattern),
				ilike(table.externalReferTable.address, pattern),
				ilike(table.externalReferTable.phone, pattern),
				ilike(table.externalReferTable.email, pattern)
			);
		const notDeletedCondition = ne(table.externalReferTable.statusId, StatusEnum.DELETED);
		let whereExpr = searchCondition
			? and(notDeletedCondition, searchCondition)
			: notDeletedCondition;

		const hospitalId = params?.hospitalId;
		if (hospitalId != null && hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.externalReferTable.hospitalId, hospitalId));
		}

		const [data, countResult] = await Promise.all([
			ensureDb().query.externalReferTable.findMany({
				where: whereExpr,
				with: externalReferWithRelationsWith,
				limit,
				offset,
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.externalReferTable)
				.where(whereExpr),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get all with relations
export const getExternalReferWithRelations = query(async () => {
	return ensureDb().query.externalReferTable.findMany({
		with: {
			referType: true,
			hospital: true,
			title: true,
			country: true,
			phoneCountry: true,
			state: true,
			city: true,
			postalCode: true,
			status: true,
		},
	});
});

// get one
export const getExternalReferById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ExternalReferSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.externalReferTable)
			.where(eq(table.externalReferTable.id, id));
		return row ?? null;
	}
);

// get one with relations (for view/edit form)
export const getExternalReferByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return ensureDb().query.externalReferTable.findFirst({
			where: (t, funcs) => funcs.eq(t.id, id),
			with: externalReferWithRelationsWith,
		});
	}
);

// create
export const createExternalRefer = command(
	'unchecked' as const,
	async (payload: ExternalReferSchemaInsert): Promise<ExternalReferSchema> => {
		const [row] = await ensureDb()
			.insert(table.externalReferTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getExternalRefer().refresh();
		return row;
	}
);

// update
export const updateExternalRefer = command(
	'unchecked' as const,
	async (payload: ExternalReferSchemaUpdate & { id: number }): Promise<ExternalReferSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.externalReferTable)
			.set(rest as ExternalReferSchemaUpdate)
			.where(eq(table.externalReferTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getExternalRefer().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteExternalRefer = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.externalReferTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.externalReferTable.id, id));
		getExternalRefer().refresh();
	}
);

// delete complete (hard)
export const deleteExternalReferComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.externalReferTable).where(eq(table.externalReferTable.id, id));
		getExternalRefer().refresh();
	}
);
