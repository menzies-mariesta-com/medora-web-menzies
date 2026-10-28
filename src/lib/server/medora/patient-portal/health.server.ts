import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PatientPortalContext } from './require-patient-context.server';
import {
	listPatientAllergies,
	listPatientConditions,
	listPatientMedications,
	listPatientVitals
} from './clinical.server';

/** Patient-facing longitudinal health summary: vitals, allergies, conditions and medications. */
export async function buildPatientHealth(ctx: PatientPortalContext) {
	const [bloodTypeRows, vitals, allergies, conditions, medications] =
		await Promise.all([
			ensureDb()
				.select({ name: table.bloodTypeTable.name })
				.from(table.patientTable)
				.leftJoin(
					table.bloodTypeTable,
					eq(table.patientTable.bloodTypeId, table.bloodTypeTable.id)
				)
				.where(eq(table.patientTable.id, ctx.patientId))
				.limit(1),
			listPatientVitals(ctx, { limit: 20 }),
			listPatientAllergies(ctx, { limit: 50 }),
			listPatientConditions(ctx, { limit: 50 }),
			listPatientMedications(ctx, { limit: 30 })
		]);

	return {
		bloodType: bloodTypeRows[0]?.name ?? null,
		latestVitals: vitals[0] ?? null,
		vitalsHistory: vitals,
		allergies,
		conditions,
		medications
	};
}
