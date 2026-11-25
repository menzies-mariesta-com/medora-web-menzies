import { MedicationHoldReasonEnum } from '$lib/model/enum/clinical-platform.enum';

/**
 * Hold / refuse reason → Paraglide key. Shared so the dialog's dropdown and the
 * MAR tooltip label a reason identically.
 */
export const EMAR_REASON_MESSAGE_KEYS: Record<
	MedicationHoldReasonEnum,
	string
> = {
	[MedicationHoldReasonEnum.PATIENT_REFUSED]: 'emar_reason_patient_refused',
	[MedicationHoldReasonEnum.VITALS_OUT_OF_RANGE]:
		'emar_reason_vitals_out_of_range',
	[MedicationHoldReasonEnum.NPO_FOR_SURGERY]: 'emar_reason_npo_for_surgery',
	[MedicationHoldReasonEnum.DRUG_UNAVAILABLE]: 'emar_reason_drug_unavailable',
	[MedicationHoldReasonEnum.PATIENT_ABSENT]: 'emar_reason_patient_absent',
	[MedicationHoldReasonEnum.ORDER_DISCONTINUED]:
		'emar_reason_order_discontinued',
	[MedicationHoldReasonEnum.OTHER]: 'emar_reason_other'
};

/** Dropdown options for the hold / refuse branch. */
export function emarReasonOptions(
	msg: Record<string, (inputs?: object) => string>
): { value: string; label: string }[] {
	return Object.values(MedicationHoldReasonEnum).map(
		(reason: MedicationHoldReasonEnum) => ({
			value: reason,
			label: msg[EMAR_REASON_MESSAGE_KEYS[reason]]?.() ?? reason
		})
	);
}

/** Human label for a stored reason code; falls back to the raw code. */
export function emarReasonLabel(
	msg: Record<string, (inputs?: object) => string>,
	code: string | null | undefined
): string {
	if (!code) return '';
	const key =
		EMAR_REASON_MESSAGE_KEYS[code as MedicationHoldReasonEnum] ?? '';
	return key ? (msg[key]?.() ?? code) : code;
}
