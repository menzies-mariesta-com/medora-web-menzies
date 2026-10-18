import { error, type RequestEvent } from '@sveltejs/kit';
import { RoleEnum } from '$lib/model/enum/db-link';
import type { PatientSessionRow } from './patient-session.server';

export type PatientPortalContext = {
	userId: string;
	patientId: string;
	hospitalId: string;
	patient: PatientSessionRow;
};

export type RequirePatientContextOptions = {
	/** Allow access while user.must_change_password is true (e.g. change-password). */
	allowBeforePasswordChange?: boolean;
};

export function requirePatientContext(
	event: RequestEvent,
	options?: RequirePatientContextOptions
): PatientPortalContext {
	if (!event.locals.user?.id) {
		throw error(401, 'Authentication required');
	}
	if (event.locals.userRoleId !== RoleEnum.PATIENT) {
		throw error(403, 'Patient account required');
	}
	if (
		event.locals.mustChangePassword &&
		!options?.allowBeforePasswordChange
	) {
		throw error(403, 'Password change required');
	}
	const patient = event.locals.patient;
	if (!patient?.id || !patient.hospitalId) {
		throw error(403, 'No active patient profile for this account');
	}
	return {
		userId: event.locals.user.id,
		patientId: patient.id,
		hospitalId: patient.hospitalId,
		patient
	};
}
