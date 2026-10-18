import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function writeLabAudit(input: {
	hospitalId: string;
	entityType: string;
	entityId: number;
	action: string;
	staffId?: string | null;
	detail?: Record<string, unknown>;
}) {
	await ensureDb().insert(table.labAuditTable).values({
		hospitalId: input.hospitalId,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		staffId: input.staffId ?? null,
		detailJson: input.detail ?? null
	});
}
