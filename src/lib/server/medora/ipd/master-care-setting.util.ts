import { eq, type SQL } from 'drizzle-orm';
import {
	CareSettingEnum,
	parseCareSetting
} from '$lib/model/enum/care-setting.enum';

/**
 * Filter master rows by care setting (`care_setting` column on ward/room/bed
 * and their categories). Omit the setting to include every setting.
 */
export function careSettingScopeCondition(
	column: { careSetting: Parameters<typeof eq>[0] },
	careSetting?: CareSettingEnum | null
): SQL | undefined {
	return careSetting
		? eq(column.careSetting, careSetting)
		: undefined;
}

/** `?scope=` → care setting. `er` is accepted as a legacy alias for `ed`. */
export function careSettingFromScopeQuery(
	scope: string | null
): CareSettingEnum | undefined {
	return parseCareSetting(scope) ?? undefined;
}

/** Ward/room/bed pickers (`active=1`, `free=1`) default to IPD when scope is omitted. */
export function careSettingForMasterPicker(
	scope: string | null
): CareSettingEnum {
	return parseCareSetting(scope) ?? CareSettingEnum.IPD;
}
