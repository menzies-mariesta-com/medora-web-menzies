import { json, type RequestEvent } from '@sveltejs/kit';
import { applyCorsToResponse } from '$lib/server/http/cors-patient-api.server';
import {
	PATIENT_API_ALLOWED_WRITE_PATHS,
	PATIENT_API_PREFIX,
	isPatientApiReadOnlyViolation
} from './patient-api-read-only.policy';

export {
	PATIENT_API_ALLOWED_WRITE_PATHS,
	PATIENT_API_PREFIX,
	isPatientApiReadOnlyViolation
};

/**
 * The patient mobile app is an information-only client. Everything under
 * `/api/patient/v1` is read-only except for the small set of account/infra
 * writes in the policy above (sign-in, forced password change, session
 * refresh, push device registration). Keeping the list in one place prevents
 * new care actions (booking, cancelling, profile edits, …) from sneaking in
 * later.
 */
export function patientApiReadOnlyResponse(
	event: RequestEvent
): Response {
	const response = json(
		{
			message:
				'The patient app is information-only. This action is not available.'
		},
		{ status: 405 }
	);
	response.headers.set('Allow', 'GET, HEAD, OPTIONS');
	return applyCorsToResponse(response, event.request);
}
