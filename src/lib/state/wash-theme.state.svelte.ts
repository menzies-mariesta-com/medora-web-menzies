import {
	WashModeEnum,
	WashPigmentEnum
} from '$lib/model/enum/wash-theme.enum';

export const WashThemeState = $state({
	pigment: WashPigmentEnum.MINERAL as WashPigmentEnum,
	mode: WashModeEnum.LIGHT as WashModeEnum
});
