import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	MarketplaceAppFormSchema,
	MarketplaceAppFormSchemaInsert,
	MarketplaceAppFormSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getMarketplaceAppForms = query(
	'unchecked' as const,
	async (params?: {
		appId?: number | null;
	}): Promise<MarketplaceAppFormSchema[]> => {
		const notDeletedFilter = ne(
			table.marketplaceAppFormTable.statusId,
			StatusEnum.DELETED
		);
		const whereExpr =
			params?.appId == null
				? notDeletedFilter
				: and(
						notDeletedFilter,
						eq(table.marketplaceAppFormTable.appId, params.appId)
					);

		return ensureDb()
			.select()
			.from(table.marketplaceAppFormTable)
			.where(whereExpr)
			.orderBy(table.marketplaceAppFormTable.name);
	}
);

export const getMarketplaceAppFormsWithRelations = query(async () => {
	return ensureDb().query.marketplaceAppFormTable.findMany({
		where: ne(
			table.marketplaceAppFormTable.statusId,
			StatusEnum.DELETED
		),
		with: {
			app: true,
			status: true
		},
		orderBy: table.marketplaceAppFormTable.name
	});
});

export type MarketplaceAppFormWithRelations = Awaited<
	ReturnType<typeof getMarketplaceAppFormsWithRelations>
>[number];

export const getMarketplaceAppFormCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.marketplaceAppFormTable)
			.where(
				ne(table.marketplaceAppFormTable.statusId, StatusEnum.DELETED)
			);
		return row?.count ?? 0;
	}
);

export const getMarketplaceAppFormsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { appId?: number | null }
	): Promise<PaginatedResult<MarketplaceAppFormSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.marketplaceAppFormTable.statusId,
			StatusEnum.DELETED
		);
		const whereExpr =
			params?.appId == null
				? notDeletedFilter
				: and(
						notDeletedFilter,
						eq(table.marketplaceAppFormTable.appId, params.appId)
					);

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.marketplaceAppFormTable)
				.where(whereExpr)
				.orderBy(table.marketplaceAppFormTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.marketplaceAppFormTable)
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

export const getMarketplaceAppFormById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<MarketplaceAppFormSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.marketplaceAppFormTable)
			.where(
				and(
					eq(table.marketplaceAppFormTable.id, id),
					ne(
						table.marketplaceAppFormTable.statusId,
						StatusEnum.DELETED
					)
				)
			);
		return row ?? null;
	}
);

export const createMarketplaceAppForm = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAppFormSchemaInsert
	): Promise<MarketplaceAppFormSchema> => {
		const [row] = await ensureDb()
			.insert(table.marketplaceAppFormTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMarketplaceAppForms().refresh();
		return row;
	}
);

export const updateMarketplaceAppForm = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAppFormSchemaUpdate & { id: number }
	): Promise<MarketplaceAppFormSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.marketplaceAppFormTable)
			.set(rest as MarketplaceAppFormSchemaUpdate)
			.where(eq(table.marketplaceAppFormTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMarketplaceAppForms().refresh();
		return row;
	}
);

export const deleteMarketplaceAppForm = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.marketplaceAppFormTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.marketplaceAppFormTable.id, id));
		getMarketplaceAppForms().refresh();
	}
);
