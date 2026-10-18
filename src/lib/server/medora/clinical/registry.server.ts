import { and, eq, lte } from 'drizzle-orm';
import { RegistryMemberStatusEnum } from '$lib/model/enum/clinical-platform.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listRegistryDefinitions(hospitalId: string) {
	return ensureDb()
		.select()
		.from(table.registryDefinitionTable)
		.where(
			and(
				eq(table.registryDefinitionTable.hospitalId, hospitalId),
				eq(table.registryDefinitionTable.statusId, StatusEnum.ACTIVE)
			)
		);
}

export async function listRegistryMembers(input: {
	registryDefinitionId: number;
	recallOnly?: boolean;
}) {
	const conditions = [
		eq(
			table.registryMemberTable.registryDefinitionId,
			input.registryDefinitionId
		)
	];
	if (input.recallOnly) {
		const today = new Date().toISOString().slice(0, 10);
		conditions.push(lte(table.registryMemberTable.nextRecallDate, today));
	}
	return ensureDb()
		.select({
			id: table.registryMemberTable.id,
			patientId: table.registryMemberTable.patientId,
			nextRecallDate: table.registryMemberTable.nextRecallDate,
			memberStatus: table.registryMemberTable.memberStatus,
			patientName: table.patientTable.firstName
		})
		.from(table.registryMemberTable)
		.innerJoin(
			table.patientTable,
			eq(table.registryMemberTable.patientId, table.patientTable.id)
		)
		.where(and(...conditions));
}

export async function enrollRegistryMember(input: {
	registryDefinitionId: number;
	patientId: string;
	recallIntervalDays: number;
}) {
	const next = new Date();
	next.setDate(next.getDate() + input.recallIntervalDays);
	const [existing] = await ensureDb()
		.select({ id: table.registryMemberTable.id })
		.from(table.registryMemberTable)
		.where(
			and(
				eq(
					table.registryMemberTable.registryDefinitionId,
					input.registryDefinitionId
				),
				eq(table.registryMemberTable.patientId, input.patientId)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [row] = await ensureDb()
		.insert(table.registryMemberTable)
		.values({
			registryDefinitionId: input.registryDefinitionId,
			patientId: input.patientId,
			memberStatus: RegistryMemberStatusEnum.ACTIVE,
			nextRecallDate: next.toISOString().slice(0, 10)
		})
		.returning();
	return row;
}

export async function seedDefaultRegistries(hospitalId: string) {
	const defaults = [
		{ code: 'DM', name: 'Diabetes registry' },
		{ code: 'HTN', name: 'Hypertension registry' },
		{ code: 'HIV', name: 'HIV care registry' }
	];
	for (const d of defaults) {
		const [exists] = await ensureDb()
			.select({ id: table.registryDefinitionTable.id })
			.from(table.registryDefinitionTable)
			.where(
				and(
					eq(table.registryDefinitionTable.hospitalId, hospitalId),
					eq(table.registryDefinitionTable.code, d.code)
				)
			)
			.limit(1);
		if (exists) continue;
		await ensureDb().insert(table.registryDefinitionTable).values({
			hospitalId,
			code: d.code,
			name: d.name,
			inclusionRulesJson: { diagnosisKeywords: [d.code] },
			recallIntervalDays: 90
		});
	}
}
