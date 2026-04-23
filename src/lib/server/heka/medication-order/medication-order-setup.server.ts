import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNull,
	ne,
	or,
	sql
} from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import type { PaginationParams } from '$lib/model/type/pagination.type';

export type MasterEntity =
	| 'form'
	| 'route'
	| 'orderType'
	| 'doseUnit'
	| 'foodRelation'
	| 'durationUnit'
	| 'frequency';

async function requireHospital(
	event: RequestEvent,
	hospitalId: string
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);
}

function scopeHosp<
	T extends { hospitalId: unknown; deletedAt: unknown; statusId: unknown }
>(t: T, hospitalId: string) {
	return and(
		eq(t.hospitalId as never, hospitalId),
		isNull(t.deletedAt as never),
		ne(t.statusId as never, StatusEnum.DELETED)
	) as any;
}

/** Trims; pattern for ILIKE */
function likePat(raw: string): string {
	return `%${raw.trim()}%`;
}

function hasColumnFilters(
	f: Record<string, string> | undefined
): boolean {
	if (!f) return false;
	return Object.values(f).some((v) => v != null && String(v).trim() !== '');
}

function whereNameDescriptionMaster(
	t: {
		id: any;
		name: any;
		description: any;
	},
	hospitalId: string,
	f: Record<string, string>,
	legacySearch: string | undefined
) {
	const parts: any[] = [scopeHosp(t, hospitalId)];
	if (f.id) {
		const n = Number(f.id);
		if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
	}
	if (f.name) parts.push(ilike(t.name, likePat(f.name)));
	if (f.description) parts.push(ilike(t.description, likePat(f.description)));
	if (!hasColumnFilters(f) && legacySearch?.trim()) {
		parts.push(ilike(t.name, likePat(legacySearch)));
	}
	return and(...(parts as any));
}

export async function listMasterPaginated(
	event: RequestEvent,
	input: { hospitalId: string; entity: MasterEntity } & PaginationParams & {
			search?: string;
			/** Per-column filter values; keys match MariTable column `id` */
			columnFilters?: Record<string, string | undefined>;
		}
) {
	const { hospitalId, entity, search, columnFilters: rawCols } = input;
	await requireHospital(event, hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);
	const f: Record<string, string> = {};
	if (rawCols) {
		for (const [k, v] of Object.entries(rawCols)) {
			if (v != null && String(v).trim() !== '') f[k] = String(v).trim();
		}
	}
	const db = ensureDb();

	if (entity === 'form') {
		const t = table.medOrderFormTable;
		const wh = whereNameDescriptionMaster(
			t,
			hospitalId,
			f,
			search
		) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	if (entity === 'route') {
		const t = table.medOrderRouteTable;
		const wh = whereNameDescriptionMaster(t, hospitalId, f, search) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	if (entity === 'orderType') {
		const t = table.medOrderOrderTypeTable;
		const wh = whereNameDescriptionMaster(t, hospitalId, f, search) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	if (entity === 'doseUnit') {
		const t = table.medOrderDoseUnitTable;
		const wh = whereNameDescriptionMaster(t, hospitalId, f, search) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	if (entity === 'foodRelation') {
		const t = table.medOrderFoodRelationTable;
		const wh = whereNameDescriptionMaster(t, hospitalId, f, search) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	if (entity === 'durationUnit') {
		const t = table.medOrderDurationUnitTable;
		const parts: any[] = [scopeHosp(t, hospitalId)];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.code) parts.push(ilike(t.code, likePat(f.code)));
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.sequenceNo) {
			const s = f.sequenceNo.trim();
			const n = Number(s);
			if (Number.isFinite(n) && String(n) === s) {
				parts.push(eq(t.sequenceNo, n));
			} else {
				parts.push(
					sql`cast(${t.sequenceNo} as text) ilike ${`%${s}%`}`
				);
			}
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(or(ilike(t.name, q), ilike(t.code, q)) as any);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select()
				.from(t)
				.where(wh)
				.orderBy(asc(t.sequenceNo), desc(t.id))
				.limit(limit)
				.offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
	{
		const t = table.medOrderFrequencyTable;
		const parts: any[] = [scopeHosp(t, hospitalId)];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.label) parts.push(ilike(t.label, likePat(f.label)));
		if (f.kind) parts.push(ilike(t.kind, likePat(f.kind)));
		if (f.summaryText) {
			parts.push(ilike(t.summaryText, likePat(f.summaryText)) as any);
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(or(ilike(t.label, q), ilike(t.summaryText, q)) as any);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db.select().from(t).where(wh).orderBy(desc(t.id)).limit(limit).offset(offset),
			db.select({ c: count() }).from(t).where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
	}
}

export async function createMaster(
	event: RequestEvent,
	input: {
		hospitalId: string;
		entity: MasterEntity;
		payload: Record<string, unknown>;
	}
) {
	const { hospitalId, entity, payload } = input;
	await requireHospital(event, hospitalId);
	const userId = event.locals.user?.id ?? null;
	const db = ensureDb();

	if (entity === 'form') {
		const [row] = await db
			.insert(table.medOrderFormTable)
			.values({
				hospitalId,
				name: String(payload.name ?? '').trim() || '—',
				description: (payload.description as string | null) ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	if (entity === 'route') {
		const [row] = await db
			.insert(table.medOrderRouteTable)
			.values({
				hospitalId,
				name: String(payload.name ?? '').trim() || '—',
				description: (payload.description as string | null) ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	if (entity === 'orderType') {
		const [row] = await db
			.insert(table.medOrderOrderTypeTable)
			.values({
				hospitalId,
				name: String(payload.name ?? '').trim() || '—',
				description: (payload.description as string | null) ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	if (entity === 'doseUnit') {
		const [row] = await db
			.insert(table.medOrderDoseUnitTable)
			.values({
				hospitalId,
				name: String(payload.name ?? '').trim() || '—',
				description: (payload.description as string | null) ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	if (entity === 'foodRelation') {
		const [row] = await db
			.insert(table.medOrderFoodRelationTable)
			.values({
				hospitalId,
				name: String(payload.name ?? '').trim() || '—',
				description: (payload.description as string | null) ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	if (entity === 'durationUnit') {
		const [row] = await db
			.insert(table.medOrderDurationUnitTable)
			.values({
				hospitalId,
				code: String(payload.code ?? '').trim() || 'code',
				name: String(payload.name ?? '').trim() || '—',
				sequenceNo: Number(payload.sequenceNo ?? 0) || 0,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		return row;
	}
	const [row] = await db
		.insert(table.medOrderFrequencyTable)
		.values({
			hospitalId,
			label: String(payload.label ?? '').trim() || '—',
			kind: String(payload.kind ?? 'custom'),
			config:
				payload.config && typeof payload.config === 'object'
					? (payload.config as Record<string, unknown>)
					: {},
			summaryText: (payload.summaryText as string | null) ?? null,
			createdBy: userId,
			updatedBy: userId
		})
		.returning();
	return row;
}

export async function updateMaster(
	event: RequestEvent,
	input: {
		hospitalId: string;
		entity: MasterEntity;
		id: number;
		payload: Record<string, unknown>;
	}
) {
	const { hospitalId, entity, id, payload } = input;
	await requireHospital(event, hospitalId);
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	const userId = event.locals.user?.id ?? null;
	const db = ensureDb();

	if (entity === 'form') {
		const [row] = await db
			.update(table.medOrderFormTable)
			.set({
					name: payload.name != null ? String(payload.name) : undefined,
					description: payload.description as string | null | undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderFormTable.id, id),
					eq(table.medOrderFormTable.hospitalId, hospitalId),
					isNull(table.medOrderFormTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	if (entity === 'route') {
		const [row] = await db
			.update(table.medOrderRouteTable)
			.set({
					name: payload.name != null ? String(payload.name) : undefined,
					description: payload.description as string | null | undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderRouteTable.id, id),
					eq(table.medOrderRouteTable.hospitalId, hospitalId),
					isNull(table.medOrderRouteTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	if (entity === 'orderType') {
		const [row] = await db
			.update(table.medOrderOrderTypeTable)
			.set({
					name: payload.name != null ? String(payload.name) : undefined,
					description: payload.description as string | null | undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderOrderTypeTable.id, id),
					eq(table.medOrderOrderTypeTable.hospitalId, hospitalId),
					isNull(table.medOrderOrderTypeTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	if (entity === 'doseUnit') {
		const [row] = await db
			.update(table.medOrderDoseUnitTable)
			.set({
					name: payload.name != null ? String(payload.name) : undefined,
					description: payload.description as string | null | undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderDoseUnitTable.id, id),
					eq(table.medOrderDoseUnitTable.hospitalId, hospitalId),
					isNull(table.medOrderDoseUnitTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	if (entity === 'foodRelation') {
		const [row] = await db
			.update(table.medOrderFoodRelationTable)
			.set({
					name: payload.name != null ? String(payload.name) : undefined,
					description: payload.description as string | null | undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderFoodRelationTable.id, id),
					eq(table.medOrderFoodRelationTable.hospitalId, hospitalId),
					isNull(table.medOrderFoodRelationTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	if (entity === 'durationUnit') {
		const [row] = await db
			.update(table.medOrderDurationUnitTable)
			.set({
					code: payload.code != null ? String(payload.code) : undefined,
					name: payload.name != null ? String(payload.name) : undefined,
					sequenceNo:
						payload.sequenceNo != null
							? Number(payload.sequenceNo)
							: undefined,
					updatedBy: userId
			})
			.where(
				and(
					eq(table.medOrderDurationUnitTable.id, id),
					eq(table.medOrderDurationUnitTable.hospitalId, hospitalId),
					isNull(table.medOrderDurationUnitTable.deletedAt)
				)
			)
			.returning();
		if (!row) throw error(404, 'Not found');
		return row;
	}
	const [row] = await db
		.update(table.medOrderFrequencyTable)
		.set({
				label: payload.label != null ? String(payload.label) : undefined,
				kind: payload.kind != null ? String(payload.kind) : undefined,
				config: payload.config as Record<string, unknown> | undefined,
				summaryText: payload.summaryText as string | null | undefined,
				updatedBy: userId
		})
		.where(
			and(
				eq(table.medOrderFrequencyTable.id, id),
				eq(table.medOrderFrequencyTable.hospitalId, hospitalId),
				isNull(table.medOrderFrequencyTable.deletedAt)
			)
		)
		.returning();
	if (!row) throw error(404, 'Not found');
	return row;
}

export async function deleteMaster(
	event: RequestEvent,
	input: { hospitalId: string; entity: MasterEntity; id: number }
) {
	const { hospitalId, entity, id } = input;
	await requireHospital(event, hospitalId);
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	const userId = event.locals.user?.id ?? null;
	const now = new Date().toISOString();
	const db = ensureDb();
	const del = {
		deletedAt: now,
		deletedBy: userId,
		statusId: StatusEnum.DELETED
	} as const;

	if (entity === 'form') {
		await db
			.update(table.medOrderFormTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderFormTable.id, id),
					eq(table.medOrderFormTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	if (entity === 'route') {
		await db
			.update(table.medOrderRouteTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderRouteTable.id, id),
					eq(table.medOrderRouteTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	if (entity === 'orderType') {
		await db
			.update(table.medOrderOrderTypeTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderOrderTypeTable.id, id),
					eq(table.medOrderOrderTypeTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	if (entity === 'doseUnit') {
		await db
			.update(table.medOrderDoseUnitTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderDoseUnitTable.id, id),
					eq(table.medOrderDoseUnitTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	if (entity === 'foodRelation') {
		await db
			.update(table.medOrderFoodRelationTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderFoodRelationTable.id, id),
					eq(table.medOrderFoodRelationTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	if (entity === 'durationUnit') {
		await db
			.update(table.medOrderDurationUnitTable)
			.set(del)
			.where(
				and(
					eq(table.medOrderDurationUnitTable.id, id),
					eq(table.medOrderDurationUnitTable.hospitalId, hospitalId)
				)
			);
		return { ok: true };
	}
	await db
		.update(table.medOrderFrequencyTable)
		.set(del)
		.where(
			and(
				eq(table.medOrderFrequencyTable.id, id),
				eq(table.medOrderFrequencyTable.hospitalId, hospitalId)
			)
		);
	return { ok: true };
}

export function parseEntity(
	param: string | undefined
): MasterEntity | null {
	const m: Record<string, MasterEntity> = {
		form: 'form',
		route: 'route',
		'order-type': 'orderType',
		'dose-unit': 'doseUnit',
		'food-relation': 'foodRelation',
		duration: 'durationUnit',
		frequency: 'frequency'
	};
	if (!param) return null;
	return m[param] ?? null;
}
