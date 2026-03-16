import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	MarketplaceAppSchema,
	MarketplaceAppSchemaInsert,
	MarketplaceAppSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getMarketplaceAppsWithRelations = query(async () => {
	return ensureDb().query.marketplaceAppTable.findMany({
		where: eq(table.marketplaceAppTable.statusId, StatusEnum.ACTIVE),
		with: {
			status: true,
			forms: true,
			archives: true
		},
		orderBy: table.marketplaceAppTable.name
	});
});

export type MarketplaceAppWithRelations = Awaited<
	ReturnType<typeof getMarketplaceAppsWithRelations>
>[number];

export const getMarketplaceApps = query(
	async (): Promise<MarketplaceAppSchema[]> => {
		return ensureDb()
			.select()
			.from(table.marketplaceAppTable)
			.where(eq(table.marketplaceAppTable.statusId, StatusEnum.ACTIVE))
			.orderBy(table.marketplaceAppTable.name);
	}
);

export const getMarketplaceAppCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.marketplaceAppTable)
		.where(eq(table.marketplaceAppTable.statusId, StatusEnum.ACTIVE));
	return row?.count ?? 0;
});

export const getMarketplaceAppsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<MarketplaceAppSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const activeFilter = eq(
			table.marketplaceAppTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.marketplaceAppTable)
				.where(activeFilter)
				.orderBy(table.marketplaceAppTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.marketplaceAppTable)
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

export const getMarketplaceAppById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<MarketplaceAppSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.marketplaceAppTable)
			.where(eq(table.marketplaceAppTable.id, id));
		return row ?? null;
	}
);

export const createMarketplaceApp = command(
	'unchecked' as const,
	async (payload: MarketplaceAppSchemaInsert): Promise<MarketplaceAppSchema> => {
		const [row] = await ensureDb()
			.insert(table.marketplaceAppTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMarketplaceApps().refresh();
		return row;
	}
);

export const updateMarketplaceApp = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAppSchemaUpdate & { id: number }
	): Promise<MarketplaceAppSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.marketplaceAppTable)
			.set(rest as MarketplaceAppSchemaUpdate)
			.where(eq(table.marketplaceAppTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMarketplaceApps().refresh();
		return row;
	}
);

export const deleteMarketplaceApp = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.marketplaceAppTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.marketplaceAppTable.id, id));
		getMarketplaceApps().refresh();
	}
);
