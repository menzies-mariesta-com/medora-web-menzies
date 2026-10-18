import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import { patientDeviceTokenTable } from '$lib/server/db/schema';
import { uuidV7 } from '$lib/util/id.util';
import type { PatientPortalContext } from './require-patient-context.server';

export async function upsertPatientDeviceToken(
	ctx: PatientPortalContext,
	input: {
		installationId: string;
		fcmToken: string;
		platform: string;
	}
) {
	const existing = await ensureDb()
		.select()
		.from(patientDeviceTokenTable)
		.where(
			and(
				eq(
					patientDeviceTokenTable.installationId,
					input.installationId
				),
				eq(patientDeviceTokenTable.userId, ctx.userId)
			)
		)
		.limit(1);

	if (existing[0]) {
		const [row] = await ensureDb()
			.update(patientDeviceTokenTable)
			.set({
				fcmToken: input.fcmToken,
				platform: input.platform,
				patientId: ctx.patientId,
				hospitalId: ctx.hospitalId,
				updatedAt: new Date().toISOString()
			})
			.where(eq(patientDeviceTokenTable.id, existing[0].id))
			.returning();
		return row;
	}

	const [row] = await ensureDb()
		.insert(patientDeviceTokenTable)
		.values({
			id: uuidV7(),
			userId: ctx.userId,
			patientId: ctx.patientId,
			hospitalId: ctx.hospitalId,
			installationId: input.installationId,
			fcmToken: input.fcmToken,
			platform: input.platform
		})
		.returning();
	return row;
}

export async function deletePatientDeviceToken(
	ctx: PatientPortalContext,
	installationId: string
) {
	await ensureDb()
		.delete(patientDeviceTokenTable)
		.where(
			and(
				eq(patientDeviceTokenTable.installationId, installationId),
				eq(patientDeviceTokenTable.userId, ctx.userId)
			)
		);
}
