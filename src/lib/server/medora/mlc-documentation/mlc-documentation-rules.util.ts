import { ClinicalFormInstanceStatusTaggingEnum } from '$lib/model/enum/db-link';

/** Fields required before a record can be signed as an attestation. */
export const MLC_SIGNATURE_FIELDS = [
	'doctor_signature',
	'doctor_signed_at',
	'witness_name',
	'witness_signature',
	'witness_signed_at'
] as const;

export type MlcRuleResult =
	| { ok: true }
	| { ok: false; message: string };

/** Signed (and amended) records are legal artefacts and must never be rewritten. */
export function isMlcRecordSigned(
	statusTaggingId: number | null
): boolean {
	return (
		statusTaggingId ===
			ClinicalFormInstanceStatusTaggingEnum.COMPLETE ||
		statusTaggingId === ClinicalFormInstanceStatusTaggingEnum.AMENDED
	);
}

/** Signature fields that are missing or blank, in declaration order. */
export function missingMlcSignatureFields(
	values: Record<string, unknown>
): string[] {
	return MLC_SIGNATURE_FIELDS.filter((key) => {
		const value = values[key];
		return (
			value === undefined ||
			value === null ||
			String(value).trim() === ''
		);
	});
}

/** Both doctor and witness must have attested before a record is signed. */
export function canSignMlc(
	values: Record<string, unknown>
): MlcRuleResult {
	return missingMlcSignatureFields(values).length === 0
		? { ok: true }
		: {
				ok: false,
				message:
					'Doctor and witness signatures with their timestamps are required before signing.'
			};
}

/** A record may be edited only while it is still a draft. */
export function canMutateMlcRecord(
	statusTaggingId: number | null
): MlcRuleResult {
	return isMlcRecordSigned(statusTaggingId)
		? {
				ok: false,
				message:
					'This MLC record is signed and cannot be edited. Add an addendum instead.'
			}
		: { ok: true };
}

/** Addenda attach to a signed record only; a draft is still directly editable. */
export function canAmendMlcRecord(
	statusTaggingId: number | null
): MlcRuleResult {
	return statusTaggingId ===
		ClinicalFormInstanceStatusTaggingEnum.COMPLETE
		? { ok: true }
		: {
				ok: false,
				message: 'Only a signed MLC record can be amended.'
			};
}
