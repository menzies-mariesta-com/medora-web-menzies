import { describe, expect, it } from 'vitest';
import { isPatientApiReadOnlyViolation } from './patient-api-read-only.policy';

describe('patient API read-only policy', () => {
	it('allows reads', () => {
		expect(
			isPatientApiReadOnlyViolation('GET', '/api/patient/v1/visits')
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation('HEAD', '/api/patient/v1/me')
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation(
				'OPTIONS',
				'/api/patient/v1/billing'
			)
		).toBe(false);
	});

	it('blocks appointment and profile writes', () => {
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/appointments'
			)
		).toBe(true);
		expect(
			isPatientApiReadOnlyViolation(
				'PATCH',
				'/api/patient/v1/appointments'
			)
		).toBe(true);
		expect(
			isPatientApiReadOnlyViolation('PATCH', '/api/patient/v1/me')
		).toBe(true);
		expect(
			isPatientApiReadOnlyViolation(
				'DELETE',
				'/api/patient/v1/documents/1'
			)
		).toBe(true);
	});

	it('keeps account and device writes available', () => {
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/auth/sign-in'
			)
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/auth/change-password'
			)
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/auth/refresh'
			)
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation('POST', '/api/patient/v1/devices')
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation(
				'DELETE',
				'/api/patient/v1/devices'
			)
		).toBe(false);
	});

	it('ignores unrelated routes and lookalike prefixes', () => {
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/staff/v1/appointments'
			)
		).toBe(false);
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v10/appointments'
			)
		).toBe(false);
	});

	it('blocks unknown nested writes and trailing slash writes', () => {
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/auth/sign-out'
			)
		).toBe(true);
		expect(
			isPatientApiReadOnlyViolation(
				'POST',
				'/api/patient/v1/devices/'
			)
		).toBe(true);
	});
});
