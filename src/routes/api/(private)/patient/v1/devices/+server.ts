import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
	deletePatientDeviceToken,
	upsertPatientDeviceToken
} from '$lib/server/medora/patient-portal/devices.server';
import {
	handlePatientOptions,
	patientJson
} from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function POST(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const body = (await event.request.json()) as Record<string, unknown>;
	const installationId = String(body.installationId ?? '');
	const fcmToken = String(body.fcmToken ?? '');
	const platform = String(body.platform ?? 'unknown');
	if (!installationId || !fcmToken) {
		throw error(400, 'installationId and fcmToken are required');
	}
	const row = await upsertPatientDeviceToken(ctx, {
		installationId,
		fcmToken,
		platform
	});
	return patientJson(event, row, { status: 201 });
}

export async function DELETE(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const installationId =
		event.url.searchParams.get('installationId') ?? '';
	if (!installationId) {
		throw error(400, 'installationId is required');
	}
	await deletePatientDeviceToken(ctx, installationId);
	return patientJson(event, { ok: true });
}
