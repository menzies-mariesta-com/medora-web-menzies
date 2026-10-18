import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function getOrCreateHospitalEdBillingConfig(hospitalId: string) {
	const db = ensureDb();
	const [existing] = await db
		.select()
		.from(table.hospitalEdBillingConfigTable)
		.where(eq(table.hospitalEdBillingConfigTable.hospitalId, hospitalId))
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(table.hospitalEdBillingConfigTable)
		.values({ hospitalId })
		.returning();
	return row!;
}

export async function updateHospitalEdBillingConfig(input: {
	hospitalId: string;
	erBedServiceItemId?: number | null;
	erConsumableServiceItemId?: number | null;
}) {
	await getOrCreateHospitalEdBillingConfig(input.hospitalId);
	const [row] = await ensureDb()
		.update(table.hospitalEdBillingConfigTable)
		.set({
			...(input.erBedServiceItemId !== undefined
				? { erBedServiceItemId: input.erBedServiceItemId }
				: {}),
			...(input.erConsumableServiceItemId !== undefined
				? { erConsumableServiceItemId: input.erConsumableServiceItemId }
				: {}),
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.hospitalEdBillingConfigTable.hospitalId, input.hospitalId))
		.returning();
	return row;
}
