import { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import type { BedRow } from '$lib/model/type/medora/ipd/ipd.type';

export type BedModalEditRow = BedRow & { careSetting?: CareSettingEnum };

/** Set before opening Create/Edit bed modal. */
export const BedModalState = $state<{
	mode: 'create' | 'edit';
	editBed: BedModalEditRow | null;
	careSetting: CareSettingEnum;
}>({
	mode: 'create',
	editBed: null,
	careSetting: CareSettingEnum.IPD
});
