import { and, eq } from 'drizzle-orm';
import { FormularyTierEnum } from '$lib/model/enum/clinical-platform.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listFormularyItems(hospitalId: string) {
	return ensureDb()
		.select({
			id: table.hospitalFormularyItemTable.id,
			itemMasterId: table.hospitalFormularyItemTable.itemMasterId,
			tier: table.hospitalFormularyItemTable.tier,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.hospitalFormularyItemTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.hospitalFormularyItemTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(table.hospitalFormularyItemTable.hospitalId, hospitalId),
				eq(
					table.hospitalFormularyItemTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
}

export async function upsertFormularyItem(input: {
	hospitalId: string;
	itemMasterId: number;
	tier: string;
}) {
	const db = ensureDb();
	const [existing] = await db
		.select({ id: table.hospitalFormularyItemTable.id })
		.from(table.hospitalFormularyItemTable)
		.where(
			and(
				eq(table.hospitalFormularyItemTable.hospitalId, input.hospitalId),
				eq(
					table.hospitalFormularyItemTable.itemMasterId,
					input.itemMasterId
				)
			)
		)
		.limit(1);
	if (existing) {
		await db
			.update(table.hospitalFormularyItemTable)
			.set({ tier: input.tier, statusId: StatusEnum.ACTIVE })
			.where(eq(table.hospitalFormularyItemTable.id, existing.id));
		return existing.id;
	}
	const [row] = await db
		.insert(table.hospitalFormularyItemTable)
		.values({
			hospitalId: input.hospitalId,
			itemMasterId: input.itemMasterId,
			tier: input.tier
		})
		.returning({ id: table.hospitalFormularyItemTable.id });
	return row?.id;
}

export async function getFormularyTierForItem(input: {
	hospitalId: string;
	itemMasterId: number;
}): Promise<string> {
	const [row] = await ensureDb()
		.select({ tier: table.hospitalFormularyItemTable.tier })
		.from(table.hospitalFormularyItemTable)
		.where(
			and(
				eq(table.hospitalFormularyItemTable.hospitalId, input.hospitalId),
				eq(
					table.hospitalFormularyItemTable.itemMasterId,
					input.itemMasterId
				),
				eq(
					table.hospitalFormularyItemTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.limit(1);
	return row?.tier ?? FormularyTierEnum.PREFERRED;
}

export async function listSubstitutionRules(hospitalId: string) {
	return ensureDb()
		.select()
		.from(table.formularySubstitutionRuleTable)
		.where(
			and(
				eq(table.formularySubstitutionRuleTable.hospitalId, hospitalId),
				eq(
					table.formularySubstitutionRuleTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
}

export async function saveSubstitutionRule(input: {
	hospitalId: string;
	restrictedItemMasterId: number;
	preferredItemMasterId: number;
}) {
	const [row] = await ensureDb()
		.insert(table.formularySubstitutionRuleTable)
		.values({
			hospitalId: input.hospitalId,
			restrictedItemMasterId: input.restrictedItemMasterId,
			preferredItemMasterId: input.preferredItemMasterId
		})
		.returning({ id: table.formularySubstitutionRuleTable.id });
	return row?.id;
}

export async function suggestSubstitution(input: {
	hospitalId: string;
	itemMasterId: number;
}) {
	const [rule] = await ensureDb()
		.select()
		.from(table.formularySubstitutionRuleTable)
		.where(
			and(
				eq(table.formularySubstitutionRuleTable.hospitalId, input.hospitalId),
				eq(
					table.formularySubstitutionRuleTable.restrictedItemMasterId,
					input.itemMasterId
				),
				eq(
					table.formularySubstitutionRuleTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.limit(1);
	return rule?.preferredItemMasterId ?? null;
}
