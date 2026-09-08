import {
	WashModeEnum,
	WashPigmentEnum
} from '$lib/model/enum/wash-theme.enum';
import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
import type { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

/**
 * @deprecated Use {@link WashThemeTool}. Kept as a thin adapter for legacy callers.
 */
export class ThemeTool {
	private wash = new WashThemeTool();

	constructor(_localStorageUtil?: LocalStorageUtil) {}

	checkThemeExists(): boolean {
		return true;
	}

	getTheme(): WashPigmentEnum {
		return this.wash.getPigment();
	}

	setTheme(theme: WashPigmentEnum): void {
		this.wash.setPigment(theme);
	}

	deleteTheme(): void {
		this.wash.apply(WashPigmentEnum.MINERAL, WashModeEnum.LIGHT);
	}
}
