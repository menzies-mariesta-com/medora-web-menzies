import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	MarketplaceAllowedFileExtensionSchema,
	MarketplaceAllowedFileExtensionSchemaInsert,
	MarketplaceAllowedFileExtensionSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq, and, ne } from 'drizzle-orm';

export const getMarketplaceAllowedFileExtensions = query(
	async (): Promise<MarketplaceAllowedFileExtensionSchema[]> => {
		return ensureDb()
			.select()
			.from(table.marketplaceAllowedFileExtensionTable)
			.where(
				ne(
					table.marketplaceAllowedFileExtensionTable.statusId,
					StatusEnum.DELETED
				)
			)
			.orderBy(table.marketplaceAllowedFileExtensionTable.name);
	}
);

export const getMarketplaceAllowedFileExtensionsWithRelations = query(
	async () => {
		return ensureDb().query.marketplaceAllowedFileExtensionTable.findMany(
			{
				where: ne(
					table.marketplaceAllowedFileExtensionTable.statusId,
					StatusEnum.DELETED
				),
				with: {
					status: true,
					archives: true
				},
				orderBy: table.marketplaceAllowedFileExtensionTable.name
			}
		);
	}
);

export type MarketplaceAllowedFileExtensionWithRelations = Awaited<
	ReturnType<typeof getMarketplaceAllowedFileExtensionsWithRelations>
>[number];

export const getMarketplaceAllowedFileExtensionCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.marketplaceAllowedFileExtensionTable)
			.where(
				ne(
					table.marketplaceAllowedFileExtensionTable.statusId,
					StatusEnum.DELETED
				)
			);
		return row?.count ?? 0;
	}
);

export const getMarketplaceAllowedFileExtensionsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<
		PaginatedResult<MarketplaceAllowedFileExtensionSchema>
	> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.marketplaceAllowedFileExtensionTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.marketplaceAllowedFileExtensionTable)
				.where(notDeletedFilter)
				.orderBy(table.marketplaceAllowedFileExtensionTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.marketplaceAllowedFileExtensionTable)
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

export const getMarketplaceAllowedFileExtensionById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<MarketplaceAllowedFileExtensionSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.marketplaceAllowedFileExtensionTable)
			.where(
				and(
					eq(table.marketplaceAllowedFileExtensionTable.id, id),
					ne(
						table.marketplaceAllowedFileExtensionTable.statusId,
						StatusEnum.DELETED
					)
				)
			);
		return row ?? null;
	}
);

export const createMarketplaceAllowedFileExtension = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAllowedFileExtensionSchemaInsert
	): Promise<MarketplaceAllowedFileExtensionSchema> => {
		const [row] = await ensureDb()
			.insert(table.marketplaceAllowedFileExtensionTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMarketplaceAllowedFileExtensions().refresh();
		return row;
	}
);

export const updateMarketplaceAllowedFileExtension = command(
	'unchecked' as const,
	async (
		payload: MarketplaceAllowedFileExtensionSchemaUpdate & {
			id: number;
		}
	): Promise<MarketplaceAllowedFileExtensionSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.marketplaceAllowedFileExtensionTable)
			.set(rest as MarketplaceAllowedFileExtensionSchemaUpdate)
			.where(eq(table.marketplaceAllowedFileExtensionTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMarketplaceAllowedFileExtensions().refresh();
		return row;
	}
);

export const deleteMarketplaceAllowedFileExtension = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.marketplaceAllowedFileExtensionTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.marketplaceAllowedFileExtensionTable.id, id));
		getMarketplaceAllowedFileExtensions().refresh();
	}
);
