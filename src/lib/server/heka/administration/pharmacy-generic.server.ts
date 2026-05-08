import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PharmacyGenericSchema,
	PharmacyGenericSchemaInsert,
	PharmacyGenericSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, desc, eq, ilike, ne, or } from 'drizzle-orm';

function hospitalScope(hospitalId: string) {
	return eq(table.pharmacyGenericTable.hospitalId, hospitalId);
}

export async function getPharmacyGenericPaginated(
	hospitalId: string,
	params?: PaginationParams & { search?: string; code?: string }
): Promise<PaginatedResult<PharmacyGenericSchema>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const parts = [
		hospitalScope(hospitalId),
		ne(table.pharmacyGenericTable.statusId, StatusEnum.DELETED)
	];
	const search = params?.search?.trim();
	if (search && search.length > 0) {
		parts.push(ilike(table.pharmacyGenericTable.name, `%${search}%`));
	}
	const codeOnly = params?.code?.trim();
	if (codeOnly && codeOnly.length > 0) {
		parts.push(ilike(table.pharmacyGenericTable.code, `%${codeOnly}%`));
	}
	if (typeof params?.statusId === 'number') {
		parts.push(eq(table.pharmacyGenericTable.statusId, params.statusId));
	}
	const whereClause = and(...parts);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.pharmacyGenericTable)
			.where(whereClause)
			.orderBy(desc(table.pharmacyGenericTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.pharmacyGenericTable)
			.where(whereClause)
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

/** Combobox / quick search: active rows only, capped limit. */
export async function searchPharmacyGenericsForHospital(
	hospitalId: string,
	input: { query: string; limit?: number }
): Promise<PharmacyGenericSchema[]> {
	const q = input.query.trim();
	const lim = Math.min(Math.max(input.limit ?? 50, 1), 100);
	const base = and(
		hospitalScope(hospitalId),
		ne(table.pharmacyGenericTable.statusId, StatusEnum.DELETED),
		eq(table.pharmacyGenericTable.statusId, StatusEnum.ACTIVE)
	);
	const whereClause =
		q.length > 0
			? and(
					base,
					or(
						ilike(table.pharmacyGenericTable.name, `%${q}%`),
						ilike(table.pharmacyGenericTable.code, `%${q}%`)
					)
				)
			: base;

	return ensureDb()
		.select()
		.from(table.pharmacyGenericTable)
		.where(whereClause)
		.orderBy(asc(table.pharmacyGenericTable.name))
		.limit(lim);
}

export async function getPharmacyGenericById(
	hospitalId: string,
	input: { id: number }
): Promise<PharmacyGenericSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.pharmacyGenericTable)
		.where(
			and(
				eq(table.pharmacyGenericTable.id, input.id),
				hospitalScope(hospitalId),
				ne(table.pharmacyGenericTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createPharmacyGeneric(
	hospitalId: string,
	payload: Omit<PharmacyGenericSchemaInsert, 'hospitalId'> & {
		name: string;
	}
): Promise<PharmacyGenericSchema> {
	const name = payload.name?.trim();
	if (!name) throw new Error('Name is required.');
	const code = payload.code?.trim() || null;
	const [row] = await ensureDb()
		.insert(table.pharmacyGenericTable)
		.values({
			hospitalId,
			name,
			code,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updatePharmacyGeneric(
	hospitalId: string,
	payload: PharmacyGenericSchemaUpdate & { id: number }
): Promise<PharmacyGenericSchema> {
	const { id, ...rest } = payload;
	const existing = await getPharmacyGenericById(hospitalId, { id });
	if (!existing) throw new Error('Pharmacy generic not found.');

	let setPayload = { ...rest } as PharmacyGenericSchemaUpdate;
	if (rest.name !== undefined) {
		const t = rest.name?.trim();
		if (!t) throw new Error('Name is required.');
		setPayload = { ...setPayload, name: t };
	}
	if (rest.code !== undefined) {
		setPayload = {
			...setPayload,
			code: rest.code?.trim() || null
		};
	}

	const [row] = await ensureDb()
		.update(table.pharmacyGenericTable)
		.set(setPayload)
		.where(
			and(
				eq(table.pharmacyGenericTable.id, id),
				hospitalScope(hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deletePharmacyGeneric(
	hospitalId: string,
	input: { id: number }
): Promise<void> {
	const existing = await getPharmacyGenericById(hospitalId, { id: input.id });
	if (!existing) throw new Error('Pharmacy generic not found.');

	const [ref] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.hospitalId, hospitalId),
				eq(table.itemMasterTable.pharmacyGenericId, input.id),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (ref) {
		throw new Error(
			'This generic is linked to one or more items. Remove or change those items first.'
		);
	}

	await ensureDb()
		.update(table.pharmacyGenericTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.pharmacyGenericTable.id, input.id),
				hospitalScope(hospitalId)
			)
		);
}
