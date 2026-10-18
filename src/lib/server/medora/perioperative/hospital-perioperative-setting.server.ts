import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function getOrCreateHospitalPerioperativeSetting(
	hospitalId: string
) {
	const db = ensureDb();
	const existing =
		await db.query.hospitalPerioperativeSettingTable.findFirst({
			where: (t, { eq }) => eq(t.hospitalId, hospitalId)
		});
	if (existing) return existing;
	const [row] = await db
		.insert(table.hospitalPerioperativeSettingTable)
		.values({ hospitalId })
		.returning();
	return row!;
}

export async function updateHospitalPerioperativeSetting(input: {
	hospitalId: string;
	defaultEdTriageSystem?: string;
	preOpMandatory?: boolean;
	whoBlockWithoutTimeout?: boolean;
}) {
	await getOrCreateHospitalPerioperativeSetting(input.hospitalId);
	const [row] = await ensureDb()
		.update(table.hospitalPerioperativeSettingTable)
		.set({
			...(input.defaultEdTriageSystem != null
				? { defaultEdTriageSystem: input.defaultEdTriageSystem }
				: {}),
			...(input.preOpMandatory != null
				? { preOpMandatory: input.preOpMandatory }
				: {}),
			...(input.whoBlockWithoutTimeout != null
				? { whoBlockWithoutTimeout: input.whoBlockWithoutTimeout }
				: {}),
			updatedAt: new Date().toISOString()
		})
		.where(
			eq(
				table.hospitalPerioperativeSettingTable.hospitalId,
				input.hospitalId
			)
		)
		.returning();
	return row;
}
