import {
	WashModeEnum,
	WashPigmentEnum
} from '$lib/model/enum/wash-theme.enum';

/** @deprecated Prefer WashThemeState */
export const ThemeState = $state<WashPigmentEnum>(WashPigmentEnum.MINERAL);

export { WashThemeState } from './wash-theme.state.svelte';
export { WashModeEnum, WashPigmentEnum };
