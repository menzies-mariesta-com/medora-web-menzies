import { error, type RequestEvent } from '@sveltejs/kit';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import { and, eq, isNull } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { HospitalColorConfigSchema } from '$lib/server/db/schema-type';
import {
	HOSPITAL_COLOR_CATEGORY,
	STATIC_COLOR_CATALOG
} from '$lib/model/const/color-purpose.const';
import {
	buildResolvedColorMap,
	resolveHospitalColor
} from '$lib/tool/color/hospital-color-resolve.util';
import { daisyUiTokenToHex } from '$lib/tool/color/color-daisyui-default.util';
import { isValidColorInput, normalizeColorInput } from '$lib/tool/color/validate-color.util';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import { toUtcIsoString } from '$lib/util/utc-instant.util';
import type {
	ColorConfigurationPayload,
	VisitBarColorHints
} from '$lib/model/type/medora/color-configuration.type';

export async function getColorConfigurationByHospital(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<ColorConfigurationPayload> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const configured = await ensureDb()
		.select({
			id: table.hospitalColorConfigTable.id,
			category: table.hospitalColorConfigTable.category,
			entityKey: table.hospitalColorConfigTable.entityKey,
			color: table.hospitalColorConfigTable.color
		})
		.from(table.hospitalColorConfigTable)
		.where(
			and(
				eq(table.hospitalColorConfigTable.hospitalId, input.hospitalId),
				isNull(table.hospitalColorConfigTable.deletedAt)
			)
		);

	const triageRows = await ensureDb()
		.select({
			level: table.edTriageLevelTable.level,
			name: table.edTriageLevelTable.name
		})
		.from(table.edTriageLevelTable)
		.where(
			and(
				eq(table.edTriageLevelTable.hospitalId, input.hospitalId),
				eq(table.edTriageLevelTable.statusId, StatusEnum.ACTIVE)
			)
		);

	const traumaRows = await ensureDb()
		.select({
			code: table.hospitalTraumaActivationLevelTable.code,
			name: table.hospitalTraumaActivationLevelTable.name
		})
		.from(table.hospitalTraumaActivationLevelTable)
		.where(
			and(
				eq(
					table.hospitalTraumaActivationLevelTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.hospitalTraumaActivationLevelTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);

	return {
		configured,
		resolvedMap: buildResolvedColorMap(configured),
		catalog: [...STATIC_COLOR_CATALOG],
		dynamicTriage: triageRows.map((r) => ({
			level: r.level,
			name: r.name,
			entityKey: String(r.level)
		})),
		dynamicTrauma: traumaRows.map((r) => ({
			code: r.code,
			name: r.name,
			entityKey: r.code
		}))
	};
}

async function syncDenormalizedColorColumns(input: {
	hospitalId: string;
	category: string;
	entityKey: string;
	color: string;
}): Promise<void> {
	const color = normalizeColorInput(input.color);
	if (!color) return;
	const db = ensureDb();
	if (input.category === HOSPITAL_COLOR_CATEGORY.ED_TRIAGE_LEVEL) {
		const level = Number(input.entityKey);
		if (!Number.isFinite(level)) return;
		await db
			.update(table.edTriageLevelTable)
			.set({
				color,
				updatedAt: toUtcIsoString()
			})
			.where(
				and(
					eq(table.edTriageLevelTable.hospitalId, input.hospitalId),
					eq(table.edTriageLevelTable.level, level)
				)
			);
	}
	if (input.category === HOSPITAL_COLOR_CATEGORY.TRAUMA_ACTIVATION_LEVEL) {
		await db
			.update(table.hospitalTraumaActivationLevelTable)
			.set({
				color,
				updatedAt: toUtcIsoString()
			})
			.where(
				and(
					eq(
						table.hospitalTraumaActivationLevelTable.hospitalId,
						input.hospitalId
					),
					eq(
						table.hospitalTraumaActivationLevelTable.code,
						input.entityKey
					)
				)
			);
	}
}

export async function upsertColorConfiguration(
	event: RequestEvent,
	input: {
		hospitalId: string;
		category: string;
		entityKey: string;
		color: string;
	}
): Promise<HospitalColorConfigSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const normalized = normalizeColorInput(input.color);
	if (!normalized || !isValidColorInput(input.color)) {
		throw error(400, 'Invalid color; use #RRGGBB or rgba(...).');
	}

	const db = ensureDb();
	const existing = await db
		.select()
		.from(table.hospitalColorConfigTable)
		.where(
			and(
				eq(table.hospitalColorConfigTable.hospitalId, input.hospitalId),
				eq(table.hospitalColorConfigTable.category, input.category),
				eq(table.hospitalColorConfigTable.entityKey, input.entityKey),
				isNull(table.hospitalColorConfigTable.deletedAt)
			)
		)
		.limit(1);

	let row: HospitalColorConfigSchema;
	if (existing[0]) {
		const [updated] = await db
			.update(table.hospitalColorConfigTable)
			.set({
				color: normalized,
				updatedAt: toUtcIsoString()
			})
			.where(eq(table.hospitalColorConfigTable.id, existing[0].id))
			.returning();
		if (!updated) throw error(500, 'Update failed');
		row = updated;
	} else {
		const [inserted] = await db
			.insert(table.hospitalColorConfigTable)
			.values({
				hospitalId: input.hospitalId,
				category: input.category,
				entityKey: input.entityKey,
				color: normalized
			})
			.returning();
		if (!inserted) throw error(500, 'Insert failed');
		row = inserted;
	}

	await syncDenormalizedColorColumns({
		hospitalId: input.hospitalId,
		category: input.category,
		entityKey: input.entityKey,
		color: normalized
	});
	await notifyHospitalMasterWrite(input.hospitalId);
	return row;
}

export async function deleteColorConfigurationOverride(
	event: RequestEvent,
	input: {
		hospitalId: string;
		category: string;
		entityKey: string;
	}
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureDb()
		.update(table.hospitalColorConfigTable)
		.set({ deletedAt: toUtcIsoString(), updatedAt: toUtcIsoString() })
		.where(
			and(
				eq(table.hospitalColorConfigTable.hospitalId, input.hospitalId),
				eq(table.hospitalColorConfigTable.category, input.category),
				eq(table.hospitalColorConfigTable.entityKey, input.entityKey),
				isNull(table.hospitalColorConfigTable.deletedAt)
			)
		);
	await notifyHospitalMasterWrite(input.hospitalId);
}

/** Server-side resolved map for embedding in APIs. */
export async function getHospitalResolvedColorMap(
	hospitalId: string
): Promise<Record<string, string>> {
	const configured = await ensureDb()
		.select({
			category: table.hospitalColorConfigTable.category,
			entityKey: table.hospitalColorConfigTable.entityKey,
			color: table.hospitalColorConfigTable.color
		})
		.from(table.hospitalColorConfigTable)
		.where(
			and(
				eq(table.hospitalColorConfigTable.hospitalId, hospitalId),
				isNull(table.hospitalColorConfigTable.deletedAt)
			)
		);
	return buildResolvedColorMap(configured);
}

export function resolveEdTriageColorFromLevelRow(
	resolvedMap: Record<string, string>,
	level: number,
	legacyToken: string | null | undefined
): string {
	const fromConfig = resolvedMap[`${HOSPITAL_COLOR_CATEGORY.ED_TRIAGE_LEVEL}:${level}`];
	if (fromConfig) return daisyUiTokenToHex(fromConfig);
	return daisyUiTokenToHex(legacyToken);
}

export async function buildVisitBarColorHints(
	hospitalId: string,
	visit: {
		id: string;
		visitTypeId?: number | null;
	}
): Promise<VisitBarColorHints> {
	const map = await getHospitalResolvedColorMap(hospitalId);
	const visitTypeBorderColor =
		visit.visitTypeId != null
			? resolveHospitalColor(
					map,
					HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
					String(visit.visitTypeId)
				)
			: null;

	const [enc] = await ensureDb()
		.select({
			level: table.edTriageLevelTable.level,
			name: table.edTriageLevelTable.name,
			legacyColor: table.edTriageLevelTable.color
		})
		.from(table.edEncounterTable)
		.leftJoin(
			table.edTriageLevelTable,
			eq(
				table.edEncounterTable.edTriageLevelId,
				table.edTriageLevelTable.id
			)
		)
		.where(
			and(
				eq(table.edEncounterTable.hospitalId, hospitalId),
				eq(table.edEncounterTable.visitId, visit.id)
			)
		)
		.limit(1);

	if (!enc?.level) {
		return {
			visitTypeBorderColor,
			edTriageRibbonColor: null,
			edTriageLevelName: null
		};
	}

	const edTriageRibbonColor = resolveEdTriageColorFromLevelRow(
		map,
		enc.level,
		enc.legacyColor
	);
	return {
		visitTypeBorderColor,
		edTriageRibbonColor,
		edTriageLevelName: enc.name ?? null
	};
}