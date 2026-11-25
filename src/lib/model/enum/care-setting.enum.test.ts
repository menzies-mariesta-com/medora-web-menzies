import { describe, expect, it } from 'vitest';
import {
	CARE_SETTING_VALUES,
	CareSettingEnum,
	careSettingLabel,
	isInpatientCareSetting,
	parseCareSetting
} from '$lib/model/enum/care-setting.enum';

/**
 * Care-setting scope parsing drives every master list filter, the ADT admission
 * dispatch (`isInpatientCareSetting`) and the bed-status board filter.
 */
describe('parseCareSetting', () => {
	it('accepts the four care settings in any case', () => {
		expect(parseCareSetting('ipd')).toBe(CareSettingEnum.IPD);
		expect(parseCareSetting('ED')).toBe(CareSettingEnum.ED);
		expect(parseCareSetting(' Icu ')).toBe(CareSettingEnum.ICU);
		expect(parseCareSetting('ot')).toBe(CareSettingEnum.OT);
	});

	it('maps the legacy `er` scope value to ED', () => {
		expect(parseCareSetting('er')).toBe(CareSettingEnum.ED);
		expect(parseCareSetting('ER')).toBe(CareSettingEnum.ED);
	});

	it('rejects anything else', () => {
		expect(parseCareSetting('')).toBeNull();
		expect(parseCareSetting(null)).toBeNull();
		expect(parseCareSetting(undefined)).toBeNull();
		expect(parseCareSetting('day-care')).toBeNull();
		expect(parseCareSetting(3)).toBeNull();
	});
});

describe('isInpatientCareSetting — admission dispatch', () => {
	it('sends ED to the encounter path and the rest to the admission path', () => {
		expect(isInpatientCareSetting(CareSettingEnum.ED)).toBe(false);
		expect(isInpatientCareSetting(CareSettingEnum.IPD)).toBe(true);
		expect(isInpatientCareSetting(CareSettingEnum.ICU)).toBe(true);
		expect(isInpatientCareSetting(CareSettingEnum.OT)).toBe(true);
	});
});

describe('careSettingLabel', () => {
	it('labels every care setting', () => {
		for (const value of CARE_SETTING_VALUES) {
			expect(careSettingLabel(value)).toBe(value);
		}
	});
});
