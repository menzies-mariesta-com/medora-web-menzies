import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
import { LabServiceMapTargetTypeEnum } from '$lib/model/enum/diagnostics.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { writeLabAudit } from './lab-audit.server';

export async function listLabTests(input: {
	hospitalId: string;
	section?: string;
}) {
	const conditions = [
		or(
			eq(table.labTestTable.hospitalId, input.hospitalId),
			sql`${table.labTestTable.hospitalId} IS NULL`
		),
		ne(table.labTestTable.statusId, StatusEnum.DELETED)
	];
	if (input.section) {
		conditions.push(eq(table.labTestTable.section, input.section));
	}
	return ensureDb()
		.select()
		.from(table.labTestTable)
		.where(and(...conditions))
		.orderBy(table.labTestTable.code);
}

export async function saveLabTest(
	input: {
		id?: number;
		hospitalId: string;
		code: string;
		name: string;
		section: string;
		dataType?: string;
		unit?: string | null;
		loincCode?: string | null;
		refRangeLow?: string | null;
		refRangeHigh?: string | null;
		refRangeText?: string | null;
		criticalLow?: string | null;
		criticalHigh?: string | null;
	},
	staffId?: string | null
) {
	const db = ensureDb();
	const values = {
		hospitalId: input.hospitalId,
		code: input.code.trim(),
		name: input.name.trim(),
		section: input.section,
		dataType: input.dataType ?? 'numeric',
		unit: input.unit ?? null,
		loincCode: input.loincCode ?? null,
		refRangeLow: input.refRangeLow ?? null,
		refRangeHigh: input.refRangeHigh ?? null,
		refRangeText: input.refRangeText ?? null,
		criticalLow: input.criticalLow ?? null,
		criticalHigh: input.criticalHigh ?? null,
		updatedAt: new Date().toISOString()
	};
	if (input.id) {
		const [row] = await db
			.update(table.labTestTable)
			.set(values)
			.where(
				and(
					eq(table.labTestTable.id, input.id),
					eq(table.labTestTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Lab test not found');
		await writeLabAudit({
			hospitalId: input.hospitalId,
			entityType: 'lab_test',
			entityId: row.id,
			action: 'update',
			staffId
		});
		return row;
	}
	const [row] = await db
		.insert(table.labTestTable)
		.values(values)
		.returning();
	if (!row) throw error(500, 'Unable to save lab test');
	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_test',
		entityId: row.id,
		action: 'create',
		staffId
	});
	return row;
}

export async function listLabPanels(input: { hospitalId: string }) {
	return ensureDb()
		.select()
		.from(table.labPanelTable)
		.where(
			and(
				or(
					eq(table.labPanelTable.hospitalId, input.hospitalId),
					sql`${table.labPanelTable.hospitalId} IS NULL`
				),
				ne(table.labPanelTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(table.labPanelTable.code);
}

export async function saveLabPanel(
	input: {
		id?: number;
		hospitalId: string;
		code: string;
		name: string;
		section: string;
		memberTestIds?: number[];
	},
	staffId?: string | null
) {
	const db = ensureDb();
	const panelValues = {
		hospitalId: input.hospitalId,
		code: input.code.trim(),
		name: input.name.trim(),
		section: input.section,
		updatedAt: new Date().toISOString()
	};
	let panelId = input.id;
	if (panelId) {
		const [row] = await db
			.update(table.labPanelTable)
			.set(panelValues)
			.where(
				and(
					eq(table.labPanelTable.id, panelId),
					eq(table.labPanelTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Lab panel not found');
	} else {
		const [row] = await db
			.insert(table.labPanelTable)
			.values(panelValues)
			.returning();
		if (!row) throw error(500, 'Unable to save panel');
		panelId = row.id;
	}
	if (input.memberTestIds) {
		await db
			.delete(table.labPanelMemberTable)
			.where(eq(table.labPanelMemberTable.panelId, panelId));
		if (input.memberTestIds.length) {
			await db.insert(table.labPanelMemberTable).values(
				input.memberTestIds.map((testId, i) => ({
					panelId,
					testId,
					sortOrder: i + 1
				}))
			);
		}
	}
	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_panel',
		entityId: panelId,
		action: input.id ? 'update' : 'create',
		staffId
	});
	return { id: panelId };
}

export async function getPanelMembers(panelId: number) {
	return ensureDb()
		.select()
		.from(table.labPanelMemberTable)
		.where(eq(table.labPanelMemberTable.panelId, panelId))
		.orderBy(table.labPanelMemberTable.sortOrder);
}

export async function listServiceTestMaps(input: { hospitalId: string }) {
	const rows = await ensureDb()
		.select({
			map: table.labServiceTestMapTable,
			serviceName: table.serviceItemTable.serviceName
		})
		.from(table.labServiceTestMapTable)
		.innerJoin(
			table.serviceItemTable,
			eq(table.labServiceTestMapTable.serviceItemId, table.serviceItemTable.id)
		)
		.where(
			and(
				eq(table.labServiceTestMapTable.hospitalId, input.hospitalId),
				ne(table.labServiceTestMapTable.statusId, StatusEnum.DELETED)
			)
		);
	return rows.map((r) => ({
		...r.map,
		serviceItemName: r.serviceName
	}));
}

export async function saveServiceTestMap(input: {
	hospitalId: string;
	serviceItemId: number;
	targetType: LabServiceMapTargetTypeEnum | string;
	targetId: number;
}) {
	const [row] = await ensureDb()
		.insert(table.labServiceTestMapTable)
		.values({
			hospitalId: input.hospitalId,
			serviceItemId: input.serviceItemId,
			targetType: input.targetType,
			targetId: input.targetId
		})
		.onConflictDoUpdate({
			target: [
				table.labServiceTestMapTable.hospitalId,
				table.labServiceTestMapTable.serviceItemId
			],
			set: {
				targetType: input.targetType,
				targetId: input.targetId,
				updatedAt: new Date().toISOString()
			}
		})
		.returning();
	return row;
}

export async function deleteServiceTestMap(input: {
	hospitalId: string;
	id: number;
}) {
	await ensureDb()
		.update(table.labServiceTestMapTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.labServiceTestMapTable.id, input.id),
				eq(table.labServiceTestMapTable.hospitalId, input.hospitalId)
			)
		);
}

export async function resolveTestsForServiceItem(input: {
	hospitalId: string;
	serviceItemId: number;
}): Promise<
	{ testIds: number[]; section: string; panelId?: number } | null
> {
	const [map] = await ensureDb()
		.select()
		.from(table.labServiceTestMapTable)
		.where(
			and(
				eq(table.labServiceTestMapTable.hospitalId, input.hospitalId),
				eq(table.labServiceTestMapTable.serviceItemId, input.serviceItemId),
				ne(table.labServiceTestMapTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!map) return null;

	if (map.targetType === LabServiceMapTargetTypeEnum.PANEL) {
		const members = await getPanelMembers(map.targetId);
		const [panel] = await ensureDb()
			.select()
			.from(table.labPanelTable)
			.where(eq(table.labPanelTable.id, map.targetId))
			.limit(1);
		return {
			testIds: members.map((m) => m.testId),
			section: panel?.section ?? 'chemistry',
			panelId: map.targetId
		};
	}

	const [test] = await ensureDb()
		.select()
		.from(table.labTestTable)
		.where(eq(table.labTestTable.id, map.targetId))
		.limit(1);
	return {
		testIds: test ? [test.id] : [],
		section: test?.section ?? 'chemistry'
	};
}

export async function isLaboratoryServiceItem(serviceItemId: number): Promise<boolean> {
	const [row] = await ensureDb()
		.select({ categoryId: table.subCategoryTable.categoryId })
		.from(table.serviceItemTable)
		.innerJoin(
			table.subCategoryTable,
			eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
		)
		.where(eq(table.serviceItemTable.id, serviceItemId))
		.limit(1);
	return row?.categoryId === CategoryEnum.LABORATORY;
}

export async function listLaboratoryServiceItems(hospitalId: string) {
	return ensureDb()
		.select({
			id: table.serviceItemTable.id,
			serviceName: table.serviceItemTable.serviceName,
			serviceCode: table.serviceItemTable.serviceCode
		})
		.from(table.serviceItemTable)
		.innerJoin(
			table.subCategoryTable,
			eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
		)
		.where(
			and(
				eq(table.serviceItemTable.hospitalId, hospitalId),
				eq(table.subCategoryTable.categoryId, CategoryEnum.LABORATORY),
				ne(table.serviceItemTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(table.serviceItemTable.serviceName);
}

export async function getTestsByIds(testIds: number[]) {
	if (!testIds.length) return [];
	return ensureDb()
		.select()
		.from(table.labTestTable)
		.where(inArray(table.labTestTable.id, testIds));
}
