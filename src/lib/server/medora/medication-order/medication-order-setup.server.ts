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
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
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

type PresetFrequencySeed = {
	label: string;
	description: string | null;
	abbreviation: string | null;
	frequencyPerDay: string | null;
	sequenceNo: number;
	isCommonFrequency: boolean;
	isTimingRequired: boolean;
	diffPlotOneHourlyValue: number | null;
	diffPlotTwoHourlyValue: number | null;
	diffPlotHalfHourlyValue: number | null;
	diffPlotFourHourlyValue: number | null;
	diffPlotSixHourlyValue: number | null;
	variableDose: boolean;
	pictorialDefinition: string | null;
	isFrequencyInfusion: boolean;
	localLanguage: string | null;
	kind: 'prn' | 'fixed_times' | 'interval' | 'custom';
	summaryText: string | null;
};

// Preset seeding is handled by DB seed (information-table-seed.ts).

async function requireHospital(
	event: RequestEvent,
	hospitalId: string
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);
}

/** Trims; pattern for ILIKE */
function likePat(raw: string): string {
	return `%${raw.trim()}%`;
}

function hasColumnFilters(
	f: Record<string, string> | undefined
): boolean {
	if (!f) return false;
	return Object.values(f).some(
		(v) => v != null && String(v).trim() !== ''
	);
}

export async function listMasterPaginated(
	event: RequestEvent,
	input: {
		hospitalId: string;
		entity: MasterEntity;
	} & PaginationParams & {
			search?: string;
			/** Per-column filter values; keys match MenziesTable column `id` */
			columnFilters?: Record<string, string | undefined>;
		}
) {
	const {
		hospitalId,
		entity,
		search,
		columnFilters: rawCols
	} = input;
	await requireHospital(event, hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);
	const f: Record<string, string> = {};
	if (rawCols) {
		for (const [k, v] of Object.entries(rawCols)) {
			if (v != null && String(v).trim() !== '')
				f[k] = String(v).trim();
		}
	}
	const db = ensureDb();

	if (entity === 'form') {
		const t = table.medOrderFormTable;
		const inact = table.medOrderFormInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.formId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.description) {
			parts.push(ilike(t.description, likePat(f.description)));
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.name, q), ilike(t.description, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.formId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.formId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.formId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	if (entity === 'route') {
		const t = table.medOrderRouteTable;
		const inact = table.medOrderRouteInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.routeId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.description) {
			parts.push(ilike(t.description, likePat(f.description)));
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.name, q), ilike(t.description, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.routeId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.routeId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.routeId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	if (entity === 'orderType') {
		const t = table.medOrderOrderTypeTable;
		const inact = table.medOrderOrderTypeInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.orderTypeId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.description) {
			parts.push(ilike(t.description, likePat(f.description)));
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.name, q), ilike(t.description, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.orderTypeId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.orderTypeId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.orderTypeId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	if (entity === 'doseUnit') {
		const t = table.medOrderDoseUnitTable;
		const inact = table.medOrderDoseUnitInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.doseUnitId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.description) {
			parts.push(ilike(t.description, likePat(f.description)));
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.name, q), ilike(t.description, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.doseUnitId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.doseUnitId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.doseUnitId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	if (entity === 'foodRelation') {
		const t = table.medOrderFoodRelationTable;
		const inact = table.medOrderFoodRelationInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.foodRelationId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.name) parts.push(ilike(t.name, likePat(f.name)));
		if (f.description) {
			parts.push(ilike(t.description, likePat(f.description)));
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.name, q), ilike(t.description, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.foodRelationId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.foodRelationId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.foodRelationId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	if (entity === 'durationUnit') {
		const t = table.medOrderDurationUnitTable;
		const inact = table.medOrderDurationUnitInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.durationUnitId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
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
				.select({
					...t,
					statusId: sql<number>`CASE
						WHEN ${inact.durationUnitId} IS NULL
							THEN ${StatusEnum.ACTIVE}
						ELSE ${StatusEnum.INACTIVE}
					END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.durationUnitId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(asc(t.sequenceNo), desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.durationUnitId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}
	{
		const t = table.medOrderFrequencyTable;
		const inact = table.medOrderFrequencyInactiveTable;
		const parts: any[] = [
			and(isNull(t.deletedAt), ne(t.statusId, StatusEnum.DELETED))
		];
		if (f.id) {
			const n = Number(f.id);
			if (Number.isFinite(n) && n > 0) parts.push(eq(t.id, n));
		}
		// statusId is hospital-scoped for frequencies (inactive rows stored in relation table)
		if (f.statusId) {
			const n = Number(f.statusId);
			if (n === StatusEnum.ACTIVE) {
				parts.push(isNull(inact.frequencyId));
			} else if (n === StatusEnum.INACTIVE) {
				parts.push(eq(inact.hospitalId, hospitalId));
			}
		}
		if (f.label) parts.push(ilike(t.label, likePat(f.label)));
		if (f.kind) parts.push(ilike(t.kind, likePat(f.kind)));
		if (f.summaryText) {
			parts.push(ilike(t.summaryText, likePat(f.summaryText)) as any);
		}
		if (!hasColumnFilters(f) && search?.trim()) {
			const q = likePat(search);
			parts.push(
				or(ilike(t.label, q), ilike(t.summaryText, q)) as any
			);
		}
		const wh = and(...(parts as any)) as any;
		const [data, tot] = await Promise.all([
			db
				.select({
					...t,
					statusId: sql<number>`CASE WHEN ${inact.frequencyId} IS NULL THEN ${StatusEnum.ACTIVE} ELSE ${StatusEnum.INACTIVE} END`
				} as any)
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.frequencyId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
				.orderBy(desc(t.id))
				.limit(limit)
				.offset(offset),
			db
				.select({ c: count() })
				.from(t)
				.leftJoin(
					inact,
					and(
						eq(inact.frequencyId, t.id),
						eq(inact.hospitalId, hospitalId)
					) as any
				)
				.where(wh)
		]);
		const total = tot[0]?.c ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
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
				isPreset: false,
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
				isPreset: false,
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
				isPreset: false,
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
				isPreset: false,
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
				isPreset: false,
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
				isPreset: false,
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
			label: String(payload.label ?? '').trim() || '—',
			isPreset: false,
			description: (payload.description as string | null) ?? null,
			abbreviation: (payload.abbreviation as string | null) ?? null,
			frequencyPerDay:
				(payload.frequencyPerDay as string | null) ?? null,
			sequenceNo: Number(payload.sequenceNo ?? 0) || 0,
			isCommonFrequency: Boolean(payload.isCommonFrequency ?? false),
			isTimingRequired: Boolean(payload.isTimingRequired ?? false),
			diffPlotOneHourlyValue:
				payload.diffPlotOneHourlyValue != null
					? Number(payload.diffPlotOneHourlyValue)
					: null,
			diffPlotTwoHourlyValue:
				payload.diffPlotTwoHourlyValue != null
					? Number(payload.diffPlotTwoHourlyValue)
					: null,
			diffPlotHalfHourlyValue:
				payload.diffPlotHalfHourlyValue != null
					? Number(payload.diffPlotHalfHourlyValue)
					: null,
			diffPlotFourHourlyValue:
				payload.diffPlotFourHourlyValue != null
					? Number(payload.diffPlotFourHourlyValue)
					: null,
			diffPlotSixHourlyValue:
				payload.diffPlotSixHourlyValue != null
					? Number(payload.diffPlotSixHourlyValue)
					: null,
			variableDose: Boolean(payload.variableDose ?? false),
			pictorialDefinition:
				(payload.pictorialDefinition as string | null) ?? null,
			isFrequencyInfusion: Boolean(
				payload.isFrequencyInfusion ?? false
			),
			localLanguage: (payload.localLanguage as string | null) ?? null,
			kind: String(payload.kind ?? 'custom'),
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
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	const userId = event.locals.user?.id ?? null;
	const db = ensureDb();
	const statusIdRaw = payload.statusId;
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;
	if (!Number.isFinite(statusId as number)) {
		throw error(400, 'statusId is required');
	}

	if (entity === 'form') {
		const t = table.medOrderFormTable;
		const inact = table.medOrderFormInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({ hospitalId, formId: id, createdBy: userId })
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(eq(inact.hospitalId, hospitalId), eq(inact.formId, id))
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	if (entity === 'route') {
		const t = table.medOrderRouteTable;
		const inact = table.medOrderRouteInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({
					hospitalId,
					routeId: id,
					createdBy: userId
				})
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(eq(inact.hospitalId, hospitalId), eq(inact.routeId, id))
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	if (entity === 'orderType') {
		const t = table.medOrderOrderTypeTable;
		const inact = table.medOrderOrderTypeInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({ hospitalId, orderTypeId: id, createdBy: userId })
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(
						eq(inact.hospitalId, hospitalId),
						eq(inact.orderTypeId, id)
					)
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	if (entity === 'doseUnit') {
		const t = table.medOrderDoseUnitTable;
		const inact = table.medOrderDoseUnitInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({ hospitalId, doseUnitId: id, createdBy: userId })
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(
						eq(inact.hospitalId, hospitalId),
						eq(inact.doseUnitId, id)
					)
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	if (entity === 'foodRelation') {
		const t = table.medOrderFoodRelationTable;
		const inact = table.medOrderFoodRelationInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({ hospitalId, foodRelationId: id, createdBy: userId })
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(
						eq(inact.hospitalId, hospitalId),
						eq(inact.foodRelationId, id)
					)
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	if (entity === 'durationUnit') {
		const t = table.medOrderDurationUnitTable;
		const inact = table.medOrderDurationUnitInactiveTable;
		const [existing] = await db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (!existing) throw error(404, 'Not found');
		if (statusId === StatusEnum.INACTIVE) {
			await db
				.insert(inact)
				.values({ hospitalId, durationUnitId: id, createdBy: userId })
				.onConflictDoNothing();
		} else if (statusId === StatusEnum.ACTIVE) {
			await db
				.delete(inact)
				.where(
					and(
						eq(inact.hospitalId, hospitalId),
						eq(inact.durationUnitId, id)
					)
				);
		}
		const [row] = await db
			.update(t)
			.set({ updatedBy: userId })
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.returning();
		if (!row) throw error(404, 'Not found');
		return { ...row, statusId } as any;
	}
	const t = table.medOrderFrequencyTable;
	const inact = table.medOrderFrequencyInactiveTable;
	const [existing] = await db
		.select({ isPreset: t.isPreset })
		.from(t)
		.where(and(eq(t.id, id), isNull(t.deletedAt)))
		.limit(1);
	if (!existing) throw error(404, 'Not found');

	const setAny: Record<string, unknown> = { updatedBy: userId };
	// statusId is hospital-scoped for frequencies via inactive relation table
	// Preset rows: only allow active/inactive toggle via relation table.
	if (statusId === StatusEnum.INACTIVE) {
		await db
			.insert(inact)
			.values({
				hospitalId,
				frequencyId: id,
				createdBy: userId
			})
			.onConflictDoNothing();
	} else if (statusId === StatusEnum.ACTIVE) {
		await db
			.delete(inact)
			.where(
				and(
					eq(inact.hospitalId, hospitalId),
					eq(inact.frequencyId, id)
				)
			);
	}
	// Keep master row status as-is (global); allow global delete via deleteMaster.

	// Preset rows: only allow active/inactive toggle via statusId.
	// (No other edits allowed; masters are seed-only.)

	const [row] = await db
		.update(t)
		.set(setAny as any)
		.where(and(eq(t.id, id), isNull(t.deletedAt)))
		.returning();
	if (!row) throw error(404, 'Not found');
	return { ...row, statusId } as any;
}

export async function deleteMaster(
	event: RequestEvent,
	input: { hospitalId: string; entity: MasterEntity; id: number }
) {
	const { hospitalId, entity, id } = input;
	await requireHospital(event, hospitalId);
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	const userId = event.locals.user?.id ?? null;
	const now = new Date().toISOString();
	const db = ensureDb();
	const del = {
		deletedAt: now,
		deletedBy: userId,
		statusId: StatusEnum.INACTIVE
	} as const;

	if (entity === 'form') {
		const t = table.medOrderFormTable;
		const [row] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (row?.isPreset) {
			throw error(
				400,
				'Preset forms cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	if (entity === 'route') {
		const t = table.medOrderRouteTable;
		const [existingRoute] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (existingRoute?.isPreset) {
			throw error(
				400,
				'Preset routes cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	if (entity === 'orderType') {
		const t = table.medOrderOrderTypeTable;
		const [row] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (row?.isPreset) {
			throw error(
				400,
				'Preset order types cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	if (entity === 'doseUnit') {
		const t = table.medOrderDoseUnitTable;
		const [row] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (row?.isPreset) {
			throw error(
				400,
				'Preset dose units cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	if (entity === 'foodRelation') {
		const t = table.medOrderFoodRelationTable;
		const [row] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (row?.isPreset) {
			throw error(
				400,
				'Preset food relations cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	if (entity === 'durationUnit') {
		const t = table.medOrderDurationUnitTable;
		const [row] = await db
			.select({ isPreset: t.isPreset })
			.from(t)
			.where(and(eq(t.id, id), isNull(t.deletedAt)))
			.limit(1);
		if (row?.isPreset) {
			throw error(
				400,
				'Preset duration units cannot be deleted. Set Active/Inactive instead.'
			);
		}
		await db.update(t).set(del).where(eq(t.id, id));
		return { ok: true };
	}
	// Do not allow deleting preset/system frequencies.
	const [existingFreq] = await db
		.select({ isPreset: table.medOrderFrequencyTable.isPreset })
		.from(table.medOrderFrequencyTable)
		.where(
			and(
				eq(table.medOrderFrequencyTable.id, id),
				isNull(table.medOrderFrequencyTable.deletedAt)
			)
		)
		.limit(1);
	if (existingFreq?.isPreset) {
		throw error(
			400,
			'Preset frequencies cannot be deleted. Set Active/Inactive instead.'
		);
	}
	await db
		.update(table.medOrderFrequencyTable)
		.set(del)
		.where(eq(table.medOrderFrequencyTable.id, id));
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
