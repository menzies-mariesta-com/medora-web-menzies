/**
 * Where a ward / room / bed delivers care. Replaces the old `is_er` boolean.
 * ED beds occupy via `ed_encounter`; IPD / ICU / OT beds occupy via `ipd_admission`.
 */
export enum CareSettingEnum {
	IPD = 'IPD',
	ED = 'ED',
	ICU = 'ICU',
	OT = 'OT'
}

export const CARE_SETTING_VALUES: readonly CareSettingEnum[] = [
	CareSettingEnum.IPD,
	CareSettingEnum.ED,
	CareSettingEnum.ICU,
	CareSettingEnum.OT
];

/** `er` is accepted as a legacy alias for `ed`. Case-insensitive. */
export function parseCareSetting(
	value: unknown
): CareSettingEnum | null {
	const v = String(value ?? '')
		.trim()
		.toUpperCase();
	if (v === 'ER') return CareSettingEnum.ED;
	return (CARE_SETTING_VALUES as readonly string[]).includes(v)
		? (v as CareSettingEnum)
		: null;
}

/** IPD, ICU and OT all admit through `ipd_admission` (inpatient bed stay). */
export function isInpatientCareSetting(
	value: CareSettingEnum
): boolean {
	return value !== CareSettingEnum.ED;
}

export function careSettingLabel(value: CareSettingEnum): string {
	if (value === CareSettingEnum.ED) return 'ED';
	if (value === CareSettingEnum.ICU) return 'ICU';
	if (value === CareSettingEnum.OT) return 'OT';
	return 'IPD';
}
