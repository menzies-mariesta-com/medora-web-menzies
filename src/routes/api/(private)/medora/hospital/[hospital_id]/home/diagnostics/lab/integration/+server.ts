import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getIntegrationHealth,
	listRecentIntegrationMessages
} from '$lib/server/medora/diagnostics/lab-integration-inbox.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const [health, recent] = await Promise.all([
		getIntegrationHealth(hospitalId),
		listRecentIntegrationMessages({ hospitalId })
	]);
	return json({ health, recent });
}
