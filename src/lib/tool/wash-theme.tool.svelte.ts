import { browser } from '$app/environment';
import {
	applyTheme,
	initWash,
	isThemeMode,
	isWatercolorTheme,
	readStoredMode,
	readStoredTheme,
	watercolorThemes
} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
import {
	WashModeEnum,
	WashPigmentEnum
} from '$lib/model/enum/wash-theme.enum';

type MedoraHandle = ReturnType<typeof initWash>;

const DEFAULT_PIGMENT = WashPigmentEnum.MINERAL;
const DEFAULT_MODE = WashModeEnum.LIGHT;

/**
 * Sole theme authority for Medora: Wash pigments + light/dark.
 * Do not use Daisy ThemeTool alongside this — it overwrites `data-theme`.
 */
export class WashThemeTool {
	private wash: MedoraHandle | undefined;

	/**
	 * Boot Wash (ripple/tooltips) and restore stored pigment/mode.
	 * Do not pass Mineral/Light as `default*` unless the caller truly wants
	 * to override storage — `initWash` uses `defaultPigment ?? readStoredTheme()`,
	 * so providing defaults overwrites the user's saved preference on every load.
	 */
	boot(options?: {
		defaultPigment?: WashPigmentEnum;
		defaultMode?: WashModeEnum;
	}): void {
		if (!browser) return;
		this.wash = initWash({
			...(options?.defaultPigment != null
				? { defaultPigment: options.defaultPigment }
				: {}),
			...(options?.defaultMode != null
				? { defaultMode: options.defaultMode }
				: {})
		});
		// Re-read after initWash applied storage (or package defaults).
		this.apply(this.getPigment(), this.getMode());
	}

	destroy(): void {
		this.wash?.destroy();
		this.wash = undefined;
	}

	getPigment(): WashPigmentEnum {
		const stored = readStoredTheme();
		if (isWatercolorTheme(stored)) return stored as WashPigmentEnum;
		return DEFAULT_PIGMENT;
	}

	getMode(): WashModeEnum {
		const stored = readStoredMode();
		if (isThemeMode(stored)) return stored as WashModeEnum;
		return DEFAULT_MODE;
	}

	apply(pigment: WashPigmentEnum, mode: WashModeEnum): void {
		if (!browser) return;
		applyTheme(pigment, mode);
	}

	setPigment(pigment: WashPigmentEnum): void {
		this.apply(pigment, this.getMode());
	}

	setMode(mode: WashModeEnum): void {
		this.apply(this.getPigment(), mode);
	}

	listPigments(): typeof watercolorThemes {
		return watercolorThemes;
	}
}
