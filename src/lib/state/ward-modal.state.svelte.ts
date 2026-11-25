import { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';

export type WardModalEditRow = WardRow & { careSetting?: CareSettingEnum };

/** Set before opening Create/Edit ward modal. */
export const WardModalState = $state<{
	mode: 'create' | 'edit';
	editWard: WardModalEditRow | null;
	careSetting: CareSettingEnum;
}>({
	mode: 'create',
	editWard: null,
	careSetting: CareSettingEnum.IPD
});
