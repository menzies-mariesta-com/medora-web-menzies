import { describe, expect, it } from 'vitest';
import { ClinicalFormInstanceStatusTaggingEnum } from '$lib/model/enum/db-link';
import {
	canAmendMlcRecord,
	canMutateMlcRecord,
	canSignMlc,
	isMlcRecordSigned,
	missingMlcSignatureFields
} from './mlc-documentation-rules.util';

const SIGNED_VALUES = {
	doctor_signature: 'Dr Aye Aye',
	doctor_signed_at: '2026-11-25T09:00:00.000Z',
	witness_name: 'Nurse Bo',
	witness_signature: 'Bo',
	witness_signed_at: '2026-11-25T09:01:00.000Z'
};

describe('isMlcRecordSigned', () => {
	it('treats complete and amended records as signed', () => {
		expect(
			isMlcRecordSigned(
				ClinicalFormInstanceStatusTaggingEnum.COMPLETE
			)
		).toBe(true);
		expect(
			isMlcRecordSigned(ClinicalFormInstanceStatusTaggingEnum.AMENDED)
		).toBe(true);
	});

	it('treats drafts, nulls and unknown tags as unsigned', () => {
		expect(
			isMlcRecordSigned(ClinicalFormInstanceStatusTaggingEnum.DRAFT)
		).toBe(false);
		expect(isMlcRecordSigned(null)).toBe(false);
		expect(isMlcRecordSigned(999)).toBe(false);
	});
});

describe('canSignMlc', () => {
	it('accepts a fully attested record', () => {
		expect(canSignMlc(SIGNED_VALUES).ok).toBe(true);
	});

	it('rejects a record with no signatures at all', () => {
		const result = canSignMlc({});
		expect(result.ok).toBe(false);
	});

	it('rejects a blank-string signature', () => {
		const result = canSignMlc({
			...SIGNED_VALUES,
			witness_signature: '   '
		});
		expect(result.ok).toBe(false);
	});

	it('names every missing field', () => {
		expect(missingMlcSignatureFields({})).toEqual([
			'doctor_signature',
			'doctor_signed_at',
			'witness_name',
			'witness_signature',
			'witness_signed_at'
		]);
		expect(
			missingMlcSignatureFields({
				...SIGNED_VALUES,
				witness_name: null
			})
		).toEqual(['witness_name']);
	});

	it('does not accept a doctor-only attestation', () => {
		const result = canSignMlc({
			doctor_signature: 'Dr Aye Aye',
			doctor_signed_at: '2026-11-25T09:00:00.000Z'
		});
		expect(result.ok).toBe(false);
	});
});

describe('canMutateMlcRecord', () => {
	it('allows editing a draft', () => {
		expect(
			canMutateMlcRecord(ClinicalFormInstanceStatusTaggingEnum.DRAFT)
				.ok
		).toBe(true);
		expect(canMutateMlcRecord(null).ok).toBe(true);
	});

	it('refuses to edit a signed record', () => {
		expect(
			canMutateMlcRecord(
				ClinicalFormInstanceStatusTaggingEnum.COMPLETE
			).ok
		).toBe(false);
		expect(
			canMutateMlcRecord(
				ClinicalFormInstanceStatusTaggingEnum.AMENDED
			).ok
		).toBe(false);
	});
});

describe('canAmendMlcRecord', () => {
	it('allows an addendum on a signed record', () => {
		expect(
			canAmendMlcRecord(
				ClinicalFormInstanceStatusTaggingEnum.COMPLETE
			).ok
		).toBe(true);
	});

	it('refuses an addendum on a draft', () => {
		expect(
			canAmendMlcRecord(ClinicalFormInstanceStatusTaggingEnum.DRAFT)
				.ok
		).toBe(false);
	});

	it('refuses to amend an addendum, which is already a correction', () => {
		expect(
			canAmendMlcRecord(ClinicalFormInstanceStatusTaggingEnum.AMENDED)
				.ok
		).toBe(false);
	});
});
