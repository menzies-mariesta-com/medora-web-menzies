import { error, type RequestEvent } from '@sveltejs/kit';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import { and, count, desc, eq, ne } from 'drizzle-orm';
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
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';
import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';

export async function assertDocumentSettingAccessible(
	event: RequestEvent,
	hospitalId: string,
	documentSettingId: number
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);

	const [row] = await ensureDb()
		.select({
			id: table.hospitalDocumentSettingsTable.id,
			hospitalId: table.hospitalDocumentSettingsTable.hospitalId
		})
		.from(table.hospitalDocumentSettingsTable)
		.where(
			and(
				eq(table.hospitalDocumentSettingsTable.id, documentSettingId),
				ne(table.hospitalDocumentSettingsTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Document setting not found');
	if (row.hospitalId !== hospitalId) {
		throw error(400, 'Document setting is not available for this hospital');
	}
}

export async function getDocumentSettingsPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		statusId?: number | null;
	}
): Promise<PaginatedResult<DocumentSettingWithRelations>> {
	await ensureCanAccessHospital(event, params.hospitalId, {
		ownerErrorMessage:
			'You can only manage document settings of your own hospitals'
	});
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const whereExpr = and(
		eq(table.hospitalDocumentSettingsTable.hospitalId, params.hospitalId),
		paginatedEntityStatusEq(
			table.hospitalDocumentSettingsTable.statusId,
			params.statusId
		)
	);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalDocumentSettingsTable)
			.where(whereExpr)
			.orderBy(desc(table.hospitalDocumentSettingsTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalDocumentSettingsTable)
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

export async function createDocumentSetting(
	event: RequestEvent,
	input: Omit<DocumentSettingSchemaInsert, 'hospitalId'> & {
		hospitalId: string;
	}
): Promise<DocumentSettingSchema> {
	await ensureCanAccessHospital(event, input.hospitalId, {
		ownerErrorMessage:
			'You can only manage document settings of your own hospitals'
	});
	const [inserted] = await ensureDb()
		.insert(table.hospitalDocumentSettingsTable)
		.values(input)
		.returning();
	if (!inserted) throw new Error('Failed to create document setting');
	void notifyHospitalMasterWrite(input.hospitalId);

	return inserted;
}

export async function updateDocumentSetting(
	event: RequestEvent,
	input: DocumentSettingSchemaUpdate & { id: number }
): Promise<DocumentSettingSchema> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.hospitalDocumentSettingsTable.hospitalId })
		.from(table.hospitalDocumentSettingsTable)
		.where(eq(table.hospitalDocumentSettingsTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Document setting not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.hospitalDocumentSettingsTable)
		.set(data)
		.where(eq(table.hospitalDocumentSettingsTable.id, id))
		.returning();
	if (!updated) throw new Error('Failed to update document setting');
	void notifyHospitalMasterWrite(row.hospitalId);

	return updated;
}

export async function deleteDocumentSetting(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.hospitalDocumentSettingsTable.hospitalId })
		.from(table.hospitalDocumentSettingsTable)
		.where(eq(table.hospitalDocumentSettingsTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Document setting not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	await ensureDb()
		.update(table.hospitalDocumentSettingsTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.hospitalDocumentSettingsTable.id, input.id));
}
