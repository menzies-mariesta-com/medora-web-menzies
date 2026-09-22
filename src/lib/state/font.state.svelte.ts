import { FontEnum } from '$lib/model/enum/font.enum';

export const FontState = $state<{ font: FontEnum }>({
	font: FontEnum.MAPLE_MONO
});
