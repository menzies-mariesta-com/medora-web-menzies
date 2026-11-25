import {
	CARE_SETTING_VALUES,
	CareSettingEnum,
	parseCareSetting
} from '$lib/model/enum/care-setting.enum';

/**
 * Care settings a master list screen can be scoped to. The old ED-only screens
 * used `'er'`; that value still parses to `ED`.
 */
export type AdministrationMasterScope = 'ipd' | 'ed' | 'icu' | 'ot';

const SCOPE_BY_CARE_SETTING: Record<
	CareSettingEnum,
	AdministrationMasterScope
> = {
	[CareSettingEnum.IPD]: 'ipd',
	[CareSettingEnum.ED]: 'ed',
	[CareSettingEnum.ICU]: 'icu',
	[CareSettingEnum.OT]: 'ot'
};

export function careSettingOfScope(
	scope: AdministrationMasterScope
): CareSettingEnum {
	return parseCareSetting(scope) ?? CareSettingEnum.IPD;
}

export function masterScopeOfCareSetting(
	careSetting: CareSettingEnum | undefined
): AdministrationMasterScope {
	return SCOPE_BY_CARE_SETTING[careSetting ?? CareSettingEnum.IPD];
}

/** User-facing care-setting label on master list screens. */
export function masterScopeDisplayLabel(
	careSetting: CareSettingEnum | string | undefined
): string {
	return parseCareSetting(careSetting) ?? CareSettingEnum.IPD;
}

export function isEdMasterScope(
	scope: AdministrationMasterScope
): boolean {
	return careSettingOfScope(scope) === CareSettingEnum.ED;
}

export const ALL_MASTER_SCOPES: readonly AdministrationMasterScope[] =
	CARE_SETTING_VALUES.map(masterScopeOfCareSetting);

const adminBase = (hospitalId: string) =>
	`/api/medora/hospital/${hospitalId}/home/administration`;

export function masterScopeQuery(
	scope: AdministrationMasterScope
): string {
	return `scope=${scope}`;
}

export function administrationWardMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/ward-master`;
}

export function administrationWardCategoryApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/ward-master/ward-category`;
}

export function administrationRoomMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/room-master`;
}

export function administrationRoomCategoryApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/room-master/room-category`;
}

export function administrationBedMasterApi(
	hospitalId: string,
	_scope: AdministrationMasterScope
): string {
	return `${adminBase(hospitalId)}/bed-master`;
}

/** Unified ward list row (API returns wardCategoryId + careSetting). */
export function wardRowAsUnified(row: {
	id: number;
	hospitalId: string;
	branchId: string;
	wardCategoryId: number;
	name: string;
	code: string | null;
	statusId: number;
	careSetting?: string;
	branchName?: string | null;
	wardCategoryName?: string | null;
	wardMarkup?: string | null;
}) {
	return {
		...row,
		careSetting:
			parseCareSetting(row.careSetting) ?? CareSettingEnum.IPD
	};
}

export type UnifiedWardListRow = ReturnType<typeof wardRowAsUnified>;

/** Category rows carry a resolved `careSetting` (required) after list mapping. */
export type UnifiedCategoryListRow = { careSetting: CareSettingEnum };

export function roomRowAsUnified(row: {
	id: number;
	hospitalId: string;
	wardId: number;
	roomCategoryId: number;
	name: string;
	code: string | null;
	capacity: number;
	amenities: string | null;
	statusId: number;
	careSetting?: string;
	wardName?: string | null;
	wardCode?: string | null;
	roomCategoryName?: string | null;
	roomMarkup?: string | null;
	bedCount?: number;
}) {
	return {
		...row,
		careSetting:
			parseCareSetting(row.careSetting) ?? CareSettingEnum.IPD
	};
}

export type UnifiedRoomListRow = ReturnType<typeof roomRowAsUnified>;

export function bedRowAsUnified(row: {
	id: number;
	roomId: number;
	hospitalId: string;
	name: string;
	code: string | null;
	basePrice: string;
	basePriceUnitId?: number | null;
	basePriceUnitName?: string | null;
	bedStatus: number;
	statusId: number;
	careSetting?: string;
	roomName?: string | null;
	roomCode?: string | null;
	wardId?: number | null;
	wardName?: string | null;
	wardCode?: string | null;
	dailyTariff?: string | null;
}) {
	return {
		...row,
		careSetting:
			parseCareSetting(row.careSetting) ?? CareSettingEnum.IPD
	};
}

export type UnifiedBedListRow = ReturnType<typeof bedRowAsUnified>;
