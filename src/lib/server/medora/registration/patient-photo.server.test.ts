import { describe, expect, it } from 'vitest';
import {
	assertPatientPhotoPathForHospital,
	patientPhotoStorageKey
} from './patient-photo.server';

const HOSPITAL = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('patientPhotoStorageKey', () => {
	it('extracts the Tigris key from a stored path', () => {
		expect(
			patientPhotoStorageKey(
				`/api/patient-photo/patient-photos/${HOSPITAL}/p.jpg`
			)
		).toBe(`patient-photos/${HOSPITAL}/p.jpg`);
	});

	it('accepts an absolute Tigris URL', () => {
		expect(
			patientPhotoStorageKey(
				`https://bucket.t3.storage.dev/patient-photos/${HOSPITAL}/p.jpg`
			)
		).toBe(`patient-photos/${HOSPITAL}/p.jpg`);
	});

	it('rejects empty, foreign and traversal keys', () => {
		expect(patientPhotoStorageKey(null)).toBeNull();
		expect(patientPhotoStorageKey('')).toBeNull();
		expect(
			patientPhotoStorageKey('/api/staff-photo/staff-photos/x.jpg')
		).toBeNull();
		expect(
			patientPhotoStorageKey(
				'/api/patient-photo/patient-photos/../../x'
			)
		).toBeNull();
	});
});

describe('assertPatientPhotoPathForHospital', () => {
	it('accepts a path under the same hospital', () => {
		expect(() =>
			assertPatientPhotoPathForHospital(
				`/api/patient-photo/patient-photos/${HOSPITAL}/p.jpg`,
				HOSPITAL
			)
		).not.toThrow();
	});

	it('accepts null and undefined (photo cleared)', () => {
		expect(() =>
			assertPatientPhotoPathForHospital(null, HOSPITAL)
		).not.toThrow();
		expect(() =>
			assertPatientPhotoPathForHospital(undefined, HOSPITAL)
		).not.toThrow();
	});

	it('rejects another hospital, a prefixed hospital id and a foreign prefix', () => {
		const other = 'a1b2c3d4-0000-4000-8000-000000000002';
		expect(() =>
			assertPatientPhotoPathForHospital(
				`/api/patient-photo/patient-photos/${other}/p.jpg`,
				HOSPITAL
			)
		).toThrow();
		expect(() =>
			assertPatientPhotoPathForHospital(
				`/api/patient-photo/patient-photos/${HOSPITAL}x/p.jpg`,
				HOSPITAL
			)
		).toThrow();
		expect(() =>
			assertPatientPhotoPathForHospital(
				'https://evil.example/x.jpg',
				HOSPITAL
			)
		).toThrow();
	});
});
