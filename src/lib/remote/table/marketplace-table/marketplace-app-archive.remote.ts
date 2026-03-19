import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	MarketplaceAppArchiveSchema,
	MarketplaceAppArchiveSchemaInsert,
	MarketplaceAppArchiveSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getMarketplaceAppArchives = query(
	'unchecked' as const,
	async (params?: {
		appId?: number | null;
	}): Promise<MarketplaceAppArchiveSchema[]> => {
		const notDeletedFilter = ne(
			table.marketplaceAppArchiveTable.statusId,
			StatusEnum.DELETED
		);
		const whereExpr =
			params?.appId == null
				? notDeletedFilter
				: and(
						notDeletedFilter,
						eq(table.marketplaceAppArchiveTable.appId, params.appId)
					);

		return ensureDb()
			.select()
			.from(table.marketplaceAppArchiveTable)
			.where(whereExpr)
			.orderBy(table.marketplaceAppArchiveTable.createdAt);
	}
);

export const getMarketplaceAppArchivesWithRelations = query(
	async () => {
		return ensureDb().query.marketplaceAppArchiveTable.findMany({
			where: ne(
				table.marketplaceAppArchiveTable.statusId,
				StatusEnum.DELETED
			),
			with: {
				app: true,
				fileExtension: true,
				status: true
			},
			orderBy: table.marketplaceAppArchiveTable.createdAt
		});
	}
);

export type MarketplaceAppArchiveWithRelations = Awaited<
	ReturnType<typeof getMarketplaceAppArchivesWithRelations>
>[number];

export const getMarketplaceAppArchiveCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.marketplaceAppArchiveTable)
			.where(
				ne(
					table.marketplaceAppArchiveTable.statusId,
					StatusEnum.DELETED
				)
			);
		return row?.count ?? 0;
	}
);

export const getMarketplaceAppArchivesPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { appId?: number | null }
	): Promise<PaginatedResult<MarketplaceAppArchiveSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.marketplaceAppArchiveTable.statusId,
			StatusEnum.DELETED
		);
		const whereExpr =
			params?.appId == null
				? notDeletedFilter
				: and(
						notDeletedFilter,
						eq(table.marketplaceAppArchiveTable.appId, params.appId)
					);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.marketplaceAppArchiveTable)
				.where(whereExpr)
				.orderBy(table.marketplaceAppArchiveTable.createdAt)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.marketplaceAppArchiveTable)
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

export const getMarketplaceAppArchiveById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<MarketplaceAppArchiveSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.marketplaceAppArchiveTable)
			.where(
				and(
					eq(table.marketplaceAppArchiveTable.id, id),
					ne(
						table.marketplaceAppArchiveTable.statusId,
						StatusEnum.DELETED
					)
				)
			);
		return row ?? null;
	}
);

export const createMarketplaceAppArchive = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAppArchiveSchemaInsert
	): Promise<MarketplaceAppArchiveSchema> => {
		const [row] = await ensureDb()
			.insert(table.marketplaceAppArchiveTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMarketplaceAppArchives().refresh();
		return row;
	}
);

export const updateMarketplaceAppArchive = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAppArchiveSchemaUpdate & { id: number }
	): Promise<MarketplaceAppArchiveSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.marketplaceAppArchiveTable)
			.set(rest as MarketplaceAppArchiveSchemaUpdate)
			.where(eq(table.marketplaceAppArchiveTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMarketplaceAppArchives().refresh();
		return row;
	}
);

export const deleteMarketplaceAppArchive = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.marketplaceAppArchiveTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.marketplaceAppArchiveTable.id, id));
		getMarketplaceAppArchives().refresh();
	}
);
