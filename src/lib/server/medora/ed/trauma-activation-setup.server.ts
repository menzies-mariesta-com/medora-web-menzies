import { error } from '@sveltejs/kit';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	TraumaActivationLevelRow,
	TraumaMilestoneTemplateRow,
	TraumaTeamRoleRow
} from '$lib/model/type/medora/trauma-log.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, eq, ilike, ne } from 'drizzle-orm';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';
export async function ensureTraumaMastersForHospital(
	hospitalId: string
): Promise<void> {
	const db = ensureDb();
	const { sql: sqlTag } = await import('drizzle-orm');
	const defaults = [
		{
			code: 'I',
			name: 'Level I — Full team',
			description: 'Immediate life-threatening injury',
			color: 'error',
			sortOrder: 1
		},
		{
			code: 'II',
			name: 'Level II — Selective team',
			description: 'Potentially life-threatening',
			color: 'warning',
			sortOrder: 2
		},
		{
			code: 'III',
			name: 'Level III — Limited response',
			description: 'Stable trauma evaluation',
			color: 'info',
			sortOrder: 3
		}
	];
	for (const def of defaults) {
		await db.execute(sqlTag`
			INSERT INTO hospital_trauma_activation_level (hospital_id, code, name, description, color, sort_order, status_id)
			VALUES (${hospitalId}, ${def.code}, ${def.name}, ${def.description}, ${def.color}, ${def.sortOrder}, ${StatusEnum.ACTIVE})
			ON CONFLICT (hospital_id, code) DO NOTHING
		`);
	}
	const milestoneDefaults = [
		{ code: 'team_arrived', label: 'Trauma team arrived', sortOrder: 1 },
		{ code: 'primary_survey', label: 'Primary survey complete', sortOrder: 2 },
		{ code: 'imaging', label: 'Priority imaging', sortOrder: 3 }
	];
	for (const def of milestoneDefaults) {
		await db.execute(sqlTag`
			INSERT INTO hospital_trauma_milestone_template (hospital_id, code, label, sort_order, status_id)
			VALUES (${hospitalId}, ${def.code}, ${def.label}, ${def.sortOrder}, ${StatusEnum.ACTIVE})
			ON CONFLICT (hospital_id, code) DO NOTHING
		`);
	}
	const teamDefaults = [
		{ code: 'trauma_lead', label: 'Trauma team lead', sortOrder: 1 },
		{ code: 'anesthesia', label: 'Anesthesia', sortOrder: 2 },
		{ code: 'nursing', label: 'Trauma nurse', sortOrder: 3 }
	];
	for (const def of teamDefaults) {
		await db.execute(sqlTag`
			INSERT INTO hospital_trauma_team_role (hospital_id, code, label, sort_order, status_id)
			VALUES (${hospitalId}, ${def.code}, ${def.label}, ${def.sortOrder}, ${StatusEnum.ACTIVE})
			ON CONFLICT (hospital_id, code) DO NOTHING
		`);
	}
}

export async function listActiveTraumaLevels(input: {
	hospitalId: string;
}): Promise<TraumaActivationLevelRow[]> {
	await ensureTraumaMastersForHospital(input.hospitalId);
	return ensureDb()
		.select()
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
		)
		.orderBy(asc(table.hospitalTraumaActivationLevelTable.sortOrder));
}

export async function getTraumaLevelByCode(input: {
	hospitalId: string;
	code: string;
}): Promise<TraumaActivationLevelRow | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.hospitalTraumaActivationLevelTable)
		.where(
			and(
				eq(
					table.hospitalTraumaActivationLevelTable.hospitalId,
					input.hospitalId
				),
				eq(table.hospitalTraumaActivationLevelTable.code, input.code),
				ne(
					table.hospitalTraumaActivationLevelTable.statusId,
					StatusEnum.DELETED
				)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function getTraumaLevelById(input: {
	hospitalId: string;
	id: number;
}): Promise<TraumaActivationLevelRow | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.hospitalTraumaActivationLevelTable)
		.where(
			and(
				eq(table.hospitalTraumaActivationLevelTable.id, input.id),
				eq(
					table.hospitalTraumaActivationLevelTable.hospitalId,
					input.hospitalId
				),
				ne(
					table.hospitalTraumaActivationLevelTable.statusId,
					StatusEnum.DELETED
				)
			)
		);
	return row ?? null;
}

export async function getTraumaLevelsPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<TraumaActivationLevelRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(table.hospitalTraumaActivationLevelTable.hospitalId, params.hospitalId),
		paginatedEntityStatusEq(
			table.hospitalTraumaActivationLevelTable.statusId,
			params.statusId
		)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.hospitalTraumaActivationLevelTable.name, `%${nameFilter}%`)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalTraumaActivationLevelTable)
			.where(whereClause)
			.orderBy(asc(table.hospitalTraumaActivationLevelTable.sortOrder))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalTraumaActivationLevelTable)
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

export async function createTraumaLevel(
	payload: TraumaActivationLevelRow
): Promise<TraumaActivationLevelRow> {
	const code = payload.code.trim();
	if (!code) throw error(400, 'Code is required');
	const [row] = await ensureDb()
		.insert(table.hospitalTraumaActivationLevelTable)
		.values({
			hospitalId: payload.hospitalId,
			code,
			name: payload.name.trim(),
			description: payload.description ?? null,
			color: payload.color?.trim() || 'error',
			sortOrder: payload.sortOrder ?? 0,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	void notifyHospitalMasterWrite(payload.hospitalId);
	return row;
}

export async function updateTraumaLevel(payload: {
	id: number;
	hospitalId: string;
	code?: string;
	name?: string;
	description?: string | null;
	color?: string;
	sortOrder?: number;
	statusId?: number;
}): Promise<TraumaActivationLevelRow> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.hospitalTraumaActivationLevelTable)
		.set({
			...rest,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalTraumaActivationLevelTable.id, id),
				eq(table.hospitalTraumaActivationLevelTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Not found');
	void notifyHospitalMasterWrite(hospitalId);
	return row;
}

export async function deleteTraumaLevel(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.hospitalTraumaActivationLevelTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalTraumaActivationLevelTable.id, input.id),
				eq(
					table.hospitalTraumaActivationLevelTable.hospitalId,
					input.hospitalId
				)
			)
		);
	void notifyHospitalMasterWrite(input.hospitalId);
}

// Milestone templates
export async function getMilestonesPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<TraumaMilestoneTemplateRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(
			table.hospitalTraumaMilestoneTemplateTable.hospitalId,
			params.hospitalId
		),
		paginatedEntityStatusEq(
			table.hospitalTraumaMilestoneTemplateTable.statusId,
			params.statusId
		)
	];
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalTraumaMilestoneTemplateTable)
			.where(whereClause)
			.orderBy(asc(table.hospitalTraumaMilestoneTemplateTable.sortOrder))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalTraumaMilestoneTemplateTable)
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

export async function createMilestoneTemplate(payload: {
	hospitalId: string;
	code: string;
	label: string;
	sortOrder?: number;
	statusId?: number;
}): Promise<TraumaMilestoneTemplateRow> {
	const [row] = await ensureDb()
		.insert(table.hospitalTraumaMilestoneTemplateTable)
		.values({
			hospitalId: payload.hospitalId,
			code: payload.code.trim(),
			label: payload.label.trim(),
			sortOrder: payload.sortOrder ?? 0,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	void notifyHospitalMasterWrite(payload.hospitalId);
	return row;
}

export async function updateMilestoneTemplate(payload: {
	id: number;
	hospitalId: string;
	code?: string;
	label?: string;
	sortOrder?: number;
	statusId?: number;
}): Promise<TraumaMilestoneTemplateRow> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.hospitalTraumaMilestoneTemplateTable)
		.set({ ...rest, updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(table.hospitalTraumaMilestoneTemplateTable.id, id),
				eq(
					table.hospitalTraumaMilestoneTemplateTable.hospitalId,
					hospitalId
				)
			)
		)
		.returning();
	if (!row) throw error(404, 'Not found');
	void notifyHospitalMasterWrite(hospitalId);
	return row;
}

export async function deleteMilestoneTemplate(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.hospitalTraumaMilestoneTemplateTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalTraumaMilestoneTemplateTable.id, input.id),
				eq(
					table.hospitalTraumaMilestoneTemplateTable.hospitalId,
					input.hospitalId
				)
			)
		);
	void notifyHospitalMasterWrite(input.hospitalId);
}

// Team roles
export async function getTeamRolesPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<TraumaTeamRoleRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(table.hospitalTraumaTeamRoleTable.hospitalId, params.hospitalId),
		paginatedEntityStatusEq(
			table.hospitalTraumaTeamRoleTable.statusId,
			params.statusId
		)
	];
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalTraumaTeamRoleTable)
			.where(whereClause)
			.orderBy(asc(table.hospitalTraumaTeamRoleTable.sortOrder))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalTraumaTeamRoleTable)
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

export async function createTeamRole(payload: {
	hospitalId: string;
	code: string;
	label: string;
	sortOrder?: number;
	statusId?: number;
}): Promise<TraumaTeamRoleRow> {
	const [row] = await ensureDb()
		.insert(table.hospitalTraumaTeamRoleTable)
		.values({
			hospitalId: payload.hospitalId,
			code: payload.code.trim(),
			label: payload.label.trim(),
			sortOrder: payload.sortOrder ?? 0,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	void notifyHospitalMasterWrite(payload.hospitalId);
	return row;
}

export async function updateTeamRole(payload: {
	id: number;
	hospitalId: string;
	code?: string;
	label?: string;
	sortOrder?: number;
	statusId?: number;
}): Promise<TraumaTeamRoleRow> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.hospitalTraumaTeamRoleTable)
		.set({ ...rest, updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(table.hospitalTraumaTeamRoleTable.id, id),
				eq(table.hospitalTraumaTeamRoleTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Not found');
	void notifyHospitalMasterWrite(hospitalId);
	return row;
}

export async function deleteTeamRole(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.hospitalTraumaTeamRoleTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalTraumaTeamRoleTable.id, input.id),
				eq(table.hospitalTraumaTeamRoleTable.hospitalId, input.hospitalId)
			)
		);
	void notifyHospitalMasterWrite(input.hospitalId);
}

export async function listActiveMilestoneTemplates(input: {
	hospitalId: string;
}): Promise<TraumaMilestoneTemplateRow[]> {
	return ensureDb()
		.select()
		.from(table.hospitalTraumaMilestoneTemplateTable)
		.where(
			and(
				eq(
					table.hospitalTraumaMilestoneTemplateTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.hospitalTraumaMilestoneTemplateTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.orderBy(asc(table.hospitalTraumaMilestoneTemplateTable.sortOrder));
}

export async function listActiveTeamRoles(input: {
	hospitalId: string;
}): Promise<TraumaTeamRoleRow[]> {
	return ensureDb()
		.select()
		.from(table.hospitalTraumaTeamRoleTable)
		.where(
			and(
				eq(table.hospitalTraumaTeamRoleTable.hospitalId, input.hospitalId),
				eq(table.hospitalTraumaTeamRoleTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(asc(table.hospitalTraumaTeamRoleTable.sortOrder));
}