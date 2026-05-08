import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	SupplierSchema,
	SupplierSchemaInsert,
	SupplierSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { SupplierListRow } from '$lib/model/type/heka/ui-rows.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { assertInventoryPartyGeo } from '$lib/server/heka/administration/inventory-party-geo.server';

function hospitalScope(hospitalId: string) {
	return eq(table.supplierTable.hospitalId, hospitalId);
}

function nullableInt(v: unknown): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export async function getSupplierPaginated(
	hospitalId: string,
	params?: PaginationParams & {
		search?: string;
		code?: string;
		phone?: string;
	}
): Promise<PaginatedResult<SupplierListRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const parts = [
		hospitalScope(hospitalId),
		ne(table.supplierTable.statusId, StatusEnum.DELETED)
	];
	const search = params?.search?.trim();
	if (search && search.length > 0) {
		parts.push(ilike(table.supplierTable.name, `%${search}%`));
	}
	const codeOnly = params?.code?.trim();
	if (codeOnly && codeOnly.length > 0) {
		parts.push(ilike(table.supplierTable.code, `%${codeOnly}%`));
	}
	const phoneOnly = params?.phone?.trim();
	if (phoneOnly && phoneOnly.length > 0) {
		parts.push(ilike(table.supplierTable.phone, `%${phoneOnly}%`));
	}
	if (typeof params?.statusId === 'number') {
		parts.push(eq(table.supplierTable.statusId, params.statusId));
	}
	const whereClause = and(...parts);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				row: table.supplierTable,
				cityName: table.cityTable.name,
				countryName: table.countryTable.name,
				postalValue: table.postalCodeTable.value
			})
			.from(table.supplierTable)
			.leftJoin(
				table.cityTable,
				eq(table.supplierTable.cityId, table.cityTable.id)
			)
			.leftJoin(
				table.countryTable,
				eq(table.supplierTable.countryId, table.countryTable.id)
			)
			.leftJoin(
				table.postalCodeTable,
				eq(table.supplierTable.postalCodeId, table.postalCodeTable.id)
			)
			.where(whereClause)
			.orderBy(desc(table.supplierTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.supplierTable)
			.where(whereClause)
	]);
	const total = countResult[0]?.count ?? 0;
	const mapped: SupplierListRow[] = data.map((d) => ({
		...d.row,
		cityName: d.cityName ?? null,
		countryName: d.countryName ?? null,
		postalCodeLabel:
			d.postalValue != null ? String(d.postalValue) : null
	}));
	return {
		data: mapped,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function searchSuppliersForHospital(
	hospitalId: string,
	input: { query: string; limit?: number }
): Promise<SupplierSchema[]> {
	const q = input.query.trim();
	const lim = Math.min(Math.max(input.limit ?? 50, 1), 100);
	const base = and(
		hospitalScope(hospitalId),
		ne(table.supplierTable.statusId, StatusEnum.DELETED),
		eq(table.supplierTable.statusId, StatusEnum.ACTIVE)
	);
	const whereClause =
		q.length > 0
			? and(
					base,
					or(
						ilike(table.supplierTable.name, `%${q}%`),
						ilike(table.supplierTable.code, `%${q}%`),
						ilike(table.supplierTable.phone, `%${q}%`)
					)
				)
			: base;

	return ensureDb()
		.select()
		.from(table.supplierTable)
		.where(whereClause)
		.orderBy(asc(table.supplierTable.name))
		.limit(lim);
}

export async function getSupplierById(
	hospitalId: string,
	input: { id: number }
): Promise<SupplierSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.supplierTable)
		.where(
			and(
				eq(table.supplierTable.id, input.id),
				hospitalScope(hospitalId),
				ne(table.supplierTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createSupplier(
	hospitalId: string,
	payload: Omit<SupplierSchemaInsert, 'hospitalId'> & { name: string }
): Promise<SupplierSchema> {
	const name = payload.name?.trim();
	if (!name) throw new Error('Name is required.');
	await assertInventoryPartyGeo({
		countryId: payload.countryId,
		stateId: payload.stateId,
		cityId: payload.cityId,
		postalCodeId: payload.postalCodeId,
		phoneCountryId: payload.phoneCountryId
	});
	const [row] = await ensureDb()
		.insert(table.supplierTable)
		.values({
			hospitalId,
			name,
			code: payload.code != null ? String(payload.code).trim() || null : null,
			address:
				payload.address != null ? String(payload.address).trim() || null : null,
			countryId: nullableInt(payload.countryId),
			stateId: nullableInt(payload.stateId),
			cityId: nullableInt(payload.cityId),
			postalCodeId: nullableInt(payload.postalCodeId),
			phone: payload.phone != null ? String(payload.phone).trim() || null : null,
			phoneCountryId: nullableInt(payload.phoneCountryId),
			email: payload.email != null ? String(payload.email).trim() || null : null,
			remark: payload.remark != null ? String(payload.remark).trim() || null : null,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateSupplier(
	hospitalId: string,
	payload: SupplierSchemaUpdate & { id: number }
): Promise<SupplierSchema> {
	const { id, ...rest } = payload;
	const existing = await getSupplierById(hospitalId, { id });
	if (!existing) throw new Error('Supplier not found.');

	const next = {
		countryId:
			rest.countryId !== undefined
				? nullableInt(rest.countryId)
				: existing.countryId,
		stateId:
			rest.stateId !== undefined
				? nullableInt(rest.stateId)
				: existing.stateId,
		cityId:
			rest.cityId !== undefined ? nullableInt(rest.cityId) : existing.cityId,
		postalCodeId:
			rest.postalCodeId !== undefined
				? nullableInt(rest.postalCodeId)
				: existing.postalCodeId,
		phoneCountryId:
			rest.phoneCountryId !== undefined
				? nullableInt(rest.phoneCountryId)
				: existing.phoneCountryId
	};
	await assertInventoryPartyGeo({
		countryId: next.countryId,
		stateId: next.stateId,
		cityId: next.cityId,
		postalCodeId: next.postalCodeId,
		phoneCountryId: next.phoneCountryId
	});

	let setPayload = { ...rest } as SupplierSchemaUpdate;
	if (rest.name !== undefined) {
		const t = rest.name?.trim();
		if (!t) throw new Error('Name is required.');
		setPayload = { ...setPayload, name: t };
	}
	if (rest.code !== undefined) {
		setPayload = { ...setPayload, code: rest.code?.trim() || null };
	}
	if (rest.address !== undefined) {
		setPayload = { ...setPayload, address: rest.address?.trim() || null };
	}
	if (rest.phone !== undefined) {
		setPayload = { ...setPayload, phone: rest.phone?.trim() || null };
	}
	if (rest.email !== undefined) {
		setPayload = { ...setPayload, email: rest.email?.trim() || null };
	}
	if (rest.remark !== undefined) {
		setPayload = { ...setPayload, remark: rest.remark?.trim() || null };
	}

	const [row] = await ensureDb()
		.update(table.supplierTable)
		.set(setPayload)
		.where(
			and(eq(table.supplierTable.id, id), hospitalScope(hospitalId))
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteSupplier(
	hospitalId: string,
	input: { id: number }
): Promise<void> {
	const existing = await getSupplierById(hospitalId, { id: input.id });
	if (!existing) throw new Error('Supplier not found.');

	await ensureDb()
		.update(table.supplierTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(eq(table.supplierTable.id, input.id), hospitalScope(hospitalId))
		);
}
