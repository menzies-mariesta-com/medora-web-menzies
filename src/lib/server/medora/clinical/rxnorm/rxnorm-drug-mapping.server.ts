import { and, eq, ilike } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listItemsForRxnormMapping(input: {
	hospitalId: string;
	search?: string;
	limit?: number;
}) {
	const db = ensureDb();
	const limit = Math.min(input.limit ?? 50, 200);
	const search = input.search?.trim();
	const conditions = [eq(table.itemMasterTable.hospitalId, input.hospitalId)];
	if (search) {
		conditions.push(ilike(table.itemMasterTable.itemName, `%${search}%`));
	}
	return db
		.select({
			id: table.itemMasterTable.id,
			itemName: table.itemMasterTable.itemName,
			rxnormRxcui: table.itemMasterTable.rxnormRxcui
		})
		.from(table.itemMasterTable)
		.where(and(...conditions))
		.limit(limit);
}

export async function setItemRxnormMapping(input: {
	hospitalId: string;
	itemMasterId: number;
	rxnormRxcui: string | null;
}) {
	const db = ensureDb();
	const [row] = await db
		.update(table.itemMasterTable)
		.set({ rxnormRxcui: input.rxnormRxcui })
		.where(
			and(
				eq(table.itemMasterTable.id, input.itemMasterId),
				eq(table.itemMasterTable.hospitalId, input.hospitalId)
			)
		)
		.returning({ id: table.itemMasterTable.id });
	if (!row) {
		throw new Error('Item not found');
	}
	return row;
}
