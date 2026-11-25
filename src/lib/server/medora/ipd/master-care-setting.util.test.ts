import { describe, expect, it } from 'vitest';
import {
	CareSettingEnum,
	parseCareSetting
} from '$lib/model/enum/care-setting.enum';
import {
	careSettingForMasterPicker,
	careSettingFromScopeQuery
} from '$lib/server/medora/ipd/master-care-setting.util';

/**
 * `?scope=` on the ward/room/bed master APIs. Picker endpoints (`active=1`,
 * `free=1`) default to IPD; list endpoints ignore an unknown scope so they
 * return every care setting.
 */
describe('careSettingFromScopeQuery', () => {
	it('returns each care setting for its scope value', () => {
		expect(careSettingFromScopeQuery('ipd')).toBe(
			CareSettingEnum.IPD
		);
		expect(careSettingFromScopeQuery('ed')).toBe(CareSettingEnum.ED);
		expect(careSettingFromScopeQuery('icu')).toBe(
			CareSettingEnum.ICU
		);
		expect(careSettingFromScopeQuery('ot')).toBe(CareSettingEnum.OT);
	});

	it('treats `er` as ED for old links', () => {
		expect(careSettingFromScopeQuery('er')).toBe(CareSettingEnum.ED);
	});

	it('leaves the filter unset when scope is absent or unknown', () => {
		expect(careSettingFromScopeQuery(null)).toBeUndefined();
		expect(careSettingFromScopeQuery('')).toBeUndefined();
		expect(careSettingFromScopeQuery('nonsense')).toBeUndefined();
	});
});

describe('careSettingForMasterPicker', () => {
	it('defaults to IPD so inpatient pickers never leak ED beds', () => {
		expect(careSettingForMasterPicker(null)).toBe(
			CareSettingEnum.IPD
		);
		expect(careSettingForMasterPicker('nonsense')).toBe(
			CareSettingEnum.IPD
		);
		expect(careSettingForMasterPicker('ed')).toBe(CareSettingEnum.ED);
		expect(careSettingForMasterPicker('ot')).toBe(CareSettingEnum.OT);
	});
});

describe('scope round trip', () => {
	it('every care setting survives scope → care setting → scope', () => {
		for (const value of [
			CareSettingEnum.IPD,
			CareSettingEnum.ED,
			CareSettingEnum.ICU,
			CareSettingEnum.OT
		]) {
			expect(parseCareSetting(value.toLowerCase())).toBe(value);
		}
	});
});
