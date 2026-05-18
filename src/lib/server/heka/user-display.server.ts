import { inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

/**
 * Batch-resolve user ids to display labels (name, else email).
 * Unknown ids are omitted; UI should show '–' when missing.
 */
export async function getUserDisplayNameByIds(
	ids: string[]
): Promise<Record<string, string>> {
	const unique = [...new Set(ids.map((id) => id?.trim()).filter(Boolean))];
	if (unique.length === 0) return {};

	const rows = await ensureDb()
		.select({
			id: table.userTable.id,
			name: table.userTable.name,
			email: table.userTable.email
		})
		.from(table.userTable)
		.where(inArray(table.userTable.id, unique as [string, ...string[]]));

	const out: Record<string, string> = {};
	for (const r of rows) {
		const label = r.name?.trim() || r.email?.trim() || '';
		if (label) out[r.id] = label;
	}
	return out;
}
