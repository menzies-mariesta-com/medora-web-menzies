import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { refreshPatientPortalSession } from '$lib/server/medora/patient-portal/patient-auth.server';
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
	requirePatientContext(event, { allowBeforePasswordChange: true });
	if (!event.locals.session?.id) {
		return patientJson(
			event,
			{ message: 'Authentication required' },
			{ status: 401 }
		);
	}
	const { expiresAt } = await refreshPatientPortalSession(
		event.locals.session.id
	);
	return patientJson(event, { expiresAt });
}
