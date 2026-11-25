import { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import type { RoomRow } from '$lib/model/type/medora/ipd/ipd.type';

export type RoomModalEditRow = RoomRow & { careSetting?: CareSettingEnum };

/** Set before opening Create/Edit room modal. */
export const RoomModalState = $state<{
	mode: 'create' | 'edit';
	editRoom: RoomModalEditRow | null;
	careSetting: CareSettingEnum;
}>({
	mode: 'create',
	editRoom: null,
	careSetting: CareSettingEnum.IPD
});
