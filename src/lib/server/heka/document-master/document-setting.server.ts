import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, isNull, ne, or } from 'drizzle-orm';
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
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';

export async function assertDocumentSettingAccessible(
	event: RequestEvent,
	hospitalId: string,
	documentSettingId: number
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);

	const row = await ensureDb().query.documentSettingTable.findFirst({
		where: and(
			eq(table.documentSettingTable.id, documentSettingId),
			ne(table.documentSettingTable.statusId, StatusEnum.DELETED)
		)
	});
	if (!row) throw error(404, 'Document setting not found');
	if (row.hospitalId != null && row.hospitalId !== hospitalId) {
		throw error(400, 'Document setting is not available for this hospital');
	}
}

export async function getDocumentSettingsPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		statusId?: number | null;
		includeGlobal?: boolean;
	}
): Promise<PaginatedResult<DocumentSettingWithRelations>> {
	await ensureCanAccessHospital(event, params.hospitalId, {
		ownerErrorMessage:
			'You can only manage document settings of your own hospitals'
	});
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const notDeleted = ne(
		table.documentSettingTable.statusId,
		StatusEnum.DELETED
	);
	const hospitalFilter = params.includeGlobal
		? or(
				eq(table.documentSettingTable.hospitalId, params.hospitalId),
				isNull(table.documentSettingTable.hospitalId)
			)
		: eq(table.documentSettingTable.hospitalId, params.hospitalId);
	const statusFilter =
		params.statusId != null
			? eq(table.documentSettingTable.statusId, params.statusId)
			: null;
	const whereExpr =
		statusFilter != null
			? and(hospitalFilter, notDeleted, statusFilter)
			: and(hospitalFilter, notDeleted);

	const [data, countResult] = await Promise.all([
		ensureDb().query.documentSettingTable.findMany({
			where: whereExpr,
			with: { documentType: true, hospital: true, status: true },
			orderBy: (t) => desc(t.createdAt),
			limit,
			offset
		}) as unknown as Promise<DocumentSettingWithRelations[]>,
		ensureDb()
			.select({ count: count() })
			.from(table.documentSettingTable)
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
		.insert(table.documentSettingTable)
		.values(input)
		.returning();
	if (!inserted) throw new Error('Failed to create document setting');
	return inserted;
}

export async function updateDocumentSetting(
	event: RequestEvent,
	input: DocumentSettingSchemaUpdate & { id: number }
): Promise<DocumentSettingSchema> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.documentSettingTable.hospitalId })
		.from(table.documentSettingTable)
		.where(eq(table.documentSettingTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Document setting not found');
	if (row.hospitalId == null) {
		throw error(403, 'System document settings cannot be edited');
	}
	await ensureCanAccessHospital(event, row.hospitalId);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.documentSettingTable)
		.set(data)
		.where(eq(table.documentSettingTable.id, id))
		.returning();
	if (!updated) throw new Error('Failed to update document setting');
	return updated;
}

export async function deleteDocumentSetting(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.documentSettingTable.hospitalId })
		.from(table.documentSettingTable)
		.where(eq(table.documentSettingTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Document setting not found');
	if (row.hospitalId == null) {
		throw error(403, 'System document settings cannot be deleted');
	}
	await ensureCanAccessHospital(event, row.hospitalId);

	await ensureDb()
		.update(table.documentSettingTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.documentSettingTable.id, input.id));
}
