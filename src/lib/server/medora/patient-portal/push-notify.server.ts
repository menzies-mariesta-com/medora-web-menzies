import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import { patientDeviceTokenTable } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';

/**
 * Sends FCM push to all device tokens registered for a patient user.
 * Requires FCM_SERVER_KEY in environment (legacy HTTP API) or extend with FCM v1.
 */
export async function notifyPatientDevices(input: {
	userId: string;
	patientId: string;
	hospitalId: string;
	title: string;
	body: string;
	data?: Record<string, string>;
}): Promise<void> {
	const serverKey = env.FCM_SERVER_KEY?.trim();
	if (!serverKey) return;

	const tokens = await ensureDb()
		.select({ fcmToken: patientDeviceTokenTable.fcmToken })
		.from(patientDeviceTokenTable)
		.where(eq(patientDeviceTokenTable.userId, input.userId));

	for (const { fcmToken } of tokens) {
		try {
			await fetch('https://fcm.googleapis.com/fcm/send', {
				method: 'POST',
				headers: {
					Authorization: `key=${serverKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					to: fcmToken,
					notification: {
						title: input.title,
						body: input.body
					},
					data: {
						userId: input.userId,
						patientId: input.patientId,
						hospitalId: input.hospitalId,
						...input.data
					}
				})
			});
		} catch (err) {
			console.error('[push] FCM send failed', err);
		}
	}
}
