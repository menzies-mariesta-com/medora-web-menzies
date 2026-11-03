import type { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
import {
	BillingVisitOpenModeEnum as Mode,
	parseBillingVisitOpenMode
} from '$lib/model/enum/billing-visit-open-mode.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function getVisitOpenMode(
	hospitalId: string,
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<BillingVisitOpenModeEnum> {
	const hid = hospitalId.trim();
	if (!hid) return Mode.ONE_VISIT_ONE_BILL;

	const [row] = await db
		.select({
			visitOpenMode: table.hospitalBillingSettingTable.visitOpenMode
		})
		.from(table.hospitalBillingSettingTable)
		.where(eq(table.hospitalBillingSettingTable.hospitalId, hid))
		.limit(1);

	if (row?.visitOpenMode == null) {
		return Mode.ONE_VISIT_ONE_BILL;
	}
	return parseBillingVisitOpenMode(row.visitOpenMode);
}

export async function upsertVisitOpenMode(input: {
	hospitalId: string;
	visitOpenMode: BillingVisitOpenModeEnum;
}): Promise<BillingVisitOpenModeEnum> {
	const hid = input.hospitalId.trim();
	if (!hid) throw new Error('hospitalId is required');

	const mode = parseBillingVisitOpenMode(input.visitOpenMode);
	const db = ensureDb();

	await db
		.insert(table.hospitalBillingSettingTable)
		.values({
			hospitalId: hid,
			visitOpenMode: mode
		})
		.onConflictDoUpdate({
			target: table.hospitalBillingSettingTable.hospitalId,
			set: {
				visitOpenMode: mode
			}
		});

	return mode;
}
