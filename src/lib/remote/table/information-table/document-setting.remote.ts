import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSettingSchema,
	DocumentSettingSchemaInsert,
	DocumentSettingSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getDocumentSettings = query(
	async (): Promise<DocumentSettingSchema[]> => {
		return ensureDb()
			.select()
			.from(table.documentSettingTable)
			.where(eq(table.documentSettingTable.statusId, StatusEnum.ACTIVE))
			.orderBy(table.documentSettingTable.name);
	}
);

export const getDocumentSettingsWithRelations = query(async () => {
	return ensureDb().query.documentSettingTable.findMany({
		where: eq(table.documentSettingTable.statusId, StatusEnum.ACTIVE),
		with: {
			documentType: true,
			hospital: true,
			status: true
		},
		orderBy: table.documentSettingTable.name
	});
});

export type DocumentSettingWithRelations = Awaited<
	ReturnType<typeof getDocumentSettingsWithRelations>
>[number];

export const getDocumentSettingCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.documentSettingTable)
		.where(eq(table.documentSettingTable.statusId, StatusEnum.ACTIVE));
	return row?.count ?? 0;
});

export const getDocumentSettingsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<DocumentSettingWithRelations>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const activeFilter = eq(
			table.documentSettingTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb().query.documentSettingTable.findMany({
				where: activeFilter,
				with: {
					documentType: true,
					hospital: true,
					status: true
				},
				orderBy: table.documentSettingTable.name,
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.documentSettingTable)
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

export const getDocumentSettingById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<DocumentSettingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.documentSettingTable)
			.where(eq(table.documentSettingTable.id, id));
		return row ?? null;
	}
);

export const createDocumentSetting = command(
	'unchecked' as const,
	async (
		payload: DocumentSettingSchemaInsert
	): Promise<DocumentSettingSchema> => {
		const [row] = await ensureDb()
			.insert(table.documentSettingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDocumentSettings().refresh();
		return row;
	}
);

export const updateDocumentSetting = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
		code?: string | null;
		documentTypeId?: number | null;
		hospitalId?: string | null;
		marginTop?: number | null;
		marginBottom?: number | null;
		marginLeft?: number | null;
		marginRight?: number | null;
		paddingTop?: number | null;
		paddingBottom?: number | null;
		paddingLeft?: number | null;
		paddingRight?: number | null;
		pageSize?: string | null;
		pageOrientation?: string | null;
		headerHtml?: string | null;
		footerHtml?: string | null;
		showHeader?: boolean | null;
		showFooter?: boolean | null;
		description?: string | null;
		statusId?: number | null;
	}): Promise<DocumentSettingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.documentSettingTable)
			.set(rest as DocumentSettingSchemaUpdate)
			.where(eq(table.documentSettingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDocumentSettings().refresh();
		return row;
	}
);

export const deleteDocumentSetting = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.documentSettingTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.documentSettingTable.id, id));
		getDocumentSettings().refresh();
	}
);
