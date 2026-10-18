import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function getOrCreateHospitalLabSetting(hospitalId: string) {
	const db = ensureDb();
	const existing = await db.query.hospitalLabSettingTable.findFirst({
		where: (t, { eq: e }) => e(t.hospitalId, hospitalId)
	});
	if (existing) return existing;

	const [row] = await db
		.insert(table.hospitalLabSettingTable)
		.values({ hospitalId })
		.returning();
	return row!;
}

export async function updateHospitalLabSetting(input: {
	hospitalId: string;
	accessionPrefix?: string;
	criticalPolicy?: string;
	autoNursingCompleteOnRelease?: boolean;
}) {
	const db = ensureDb();
	await getOrCreateHospitalLabSetting(input.hospitalId);
	const [row] = await db
		.update(table.hospitalLabSettingTable)
		.set({
			...(input.accessionPrefix != null
				? { accessionPrefix: input.accessionPrefix }
				: {}),
			...(input.criticalPolicy != null
				? { criticalPolicy: input.criticalPolicy }
				: {}),
			...(input.autoNursingCompleteOnRelease != null
				? {
						autoNursingCompleteOnRelease:
							input.autoNursingCompleteOnRelease
					}
				: {}),
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.hospitalLabSettingTable.hospitalId, input.hospitalId))
		.returning();
	return row;
}
