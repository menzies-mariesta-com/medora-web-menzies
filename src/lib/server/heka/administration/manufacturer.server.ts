import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ManufacturerSchema,
	ManufacturerSchemaInsert,
	ManufacturerSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { ManufacturerListRow } from '$lib/model/type/heka/ui-rows.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { assertInventoryPartyGeo } from '$lib/server/heka/administration/inventory-party-geo.server';

function hospitalScope(hospitalId: string) {
	return eq(table.manufacturerTable.hospitalId, hospitalId);
}

function nullableInt(v: unknown): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export async function getManufacturerPaginated(
	hospitalId: string,
	params?: PaginationParams & {
		search?: string;
		code?: string;
		phone?: string;
	}
): Promise<PaginatedResult<ManufacturerListRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const parts = [
		hospitalScope(hospitalId),
		ne(table.manufacturerTable.statusId, StatusEnum.DELETED)
	];
	const search = params?.search?.trim();
	if (search && search.length > 0) {
		parts.push(ilike(table.manufacturerTable.name, `%${search}%`));
	}
	const codeOnly = params?.code?.trim();
	if (codeOnly && codeOnly.length > 0) {
		parts.push(ilike(table.manufacturerTable.code, `%${codeOnly}%`));
	}
	const phoneOnly = params?.phone?.trim();
	if (phoneOnly && phoneOnly.length > 0) {
		parts.push(ilike(table.manufacturerTable.phone, `%${phoneOnly}%`));
	}
	if (typeof params?.statusId === 'number') {
		parts.push(eq(table.manufacturerTable.statusId, params.statusId));
	}
	const whereClause = and(...parts);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				row: table.manufacturerTable,
				cityName: table.cityTable.name,
				countryName: table.countryTable.name,
				postalValue: table.postalCodeTable.value
			})
			.from(table.manufacturerTable)
			.leftJoin(
				table.cityTable,
				eq(table.manufacturerTable.cityId, table.cityTable.id)
			)
			.leftJoin(
				table.countryTable,
				eq(table.manufacturerTable.countryId, table.countryTable.id)
			)
			.leftJoin(
				table.postalCodeTable,
				eq(table.manufacturerTable.postalCodeId, table.postalCodeTable.id)
			)
			.where(whereClause)
			.orderBy(desc(table.manufacturerTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.manufacturerTable)
			.where(whereClause)
	]);
	const total = countResult[0]?.count ?? 0;
	const mapped: ManufacturerListRow[] = data.map((d) => ({
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

export async function searchManufacturersForHospital(
	hospitalId: string,
	input: { query: string; limit?: number }
): Promise<ManufacturerSchema[]> {
	const q = input.query.trim();
	const lim = Math.min(Math.max(input.limit ?? 50, 1), 100);
	const base = and(
		hospitalScope(hospitalId),
		ne(table.manufacturerTable.statusId, StatusEnum.DELETED),
		eq(table.manufacturerTable.statusId, StatusEnum.ACTIVE)
	);
	const whereClause =
		q.length > 0
			? and(
					base,
					or(
						ilike(table.manufacturerTable.name, `%${q}%`),
						ilike(table.manufacturerTable.code, `%${q}%`),
						ilike(table.manufacturerTable.phone, `%${q}%`)
					)
				)
			: base;

	return ensureDb()
		.select()
		.from(table.manufacturerTable)
		.where(whereClause)
		.orderBy(asc(table.manufacturerTable.name))
		.limit(lim);
}

export async function getManufacturerById(
	hospitalId: string,
	input: { id: number }
): Promise<ManufacturerSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.manufacturerTable)
		.where(
			and(
				eq(table.manufacturerTable.id, input.id),
				hospitalScope(hospitalId),
				ne(table.manufacturerTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createManufacturer(
	hospitalId: string,
	payload: Omit<ManufacturerSchemaInsert, 'hospitalId'> & { name: string }
): Promise<ManufacturerSchema> {
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
		.insert(table.manufacturerTable)
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

export async function updateManufacturer(
	hospitalId: string,
	payload: ManufacturerSchemaUpdate & { id: number }
): Promise<ManufacturerSchema> {
	const { id, ...rest } = payload;
	const existing = await getManufacturerById(hospitalId, { id });
	if (!existing) throw new Error('Manufacturer not found.');

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

	let setPayload = { ...rest } as ManufacturerSchemaUpdate;
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
		.update(table.manufacturerTable)
		.set(setPayload)
		.where(
			and(
				eq(table.manufacturerTable.id, id),
				hospitalScope(hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteManufacturer(
	hospitalId: string,
	input: { id: number }
): Promise<void> {
	const existing = await getManufacturerById(hospitalId, { id: input.id });
	if (!existing) throw new Error('Manufacturer not found.');

	const [ref] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.hospitalId, hospitalId),
				eq(table.itemMasterTable.manufacturerId, input.id),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (ref) {
		throw new Error(
			'This manufacturer is linked to one or more items. Remove or change those items first.'
		);
	}

	await ensureDb()
		.update(table.manufacturerTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.manufacturerTable.id, input.id),
				hospitalScope(hospitalId)
			)
		);
}

export async function getManufacturerByIdForItemMaster(
	hospitalId: string,
	input: { id: number }
): Promise<ManufacturerSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.manufacturerTable)
		.where(
			and(
				eq(table.manufacturerTable.id, input.id),
				hospitalScope(hospitalId),
				ne(table.manufacturerTable.statusId, StatusEnum.DELETED),
				eq(table.manufacturerTable.statusId, StatusEnum.ACTIVE)
			)
		);
	return row ?? null;
}
