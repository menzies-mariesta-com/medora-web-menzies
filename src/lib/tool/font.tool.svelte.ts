import { browser } from '$app/environment';
import { FontEnum, WASH_FONT_STYLES } from '$lib/model/enum/font.enum';
import { LocalStorageEnum } from '$lib/model/enum/local-storage.enum';
import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

const DEFAULT_FONT = FontEnum.MAPLE_MONO;

/**
 * Applies Menzies Design font styles via `html[data-font]`.
 * CSS remaps `--font-sans` / `--font-mono` / `--font-display` (see font.style.css).
 */
export class FontTool {
	private localStorageUtil = new LocalStorageUtil();

	checkFontExists(): boolean {
		return this.localStorageUtil.hasItem(LocalStorageEnum.FONT);
	}

	listStyles() {
		return WASH_FONT_STYLES;
	}

	getFont(): FontEnum {
		const value = this.localStorageUtil.getItem<string>(
			LocalStorageEnum.FONT
		);
		if (
			value &&
			Object.values(FontEnum).includes(value as FontEnum)
		) {
			return value as FontEnum;
		}
		return DEFAULT_FONT;
	}

	boot(): void {
		this.apply(this.getFont());
	}

	apply(font: FontEnum): void {
		if (!browser) return;
		document.documentElement.dataset.font = font;
		this.localStorageUtil.setItem(LocalStorageEnum.FONT, font);
	}

	setFont(font: FontEnum): void {
		this.apply(font);
	}

	deleteFont(): void {
		if (!browser) return;
		if (this.checkFontExists()) {
			this.localStorageUtil.removeItem(LocalStorageEnum.FONT);
		}
		document.documentElement.removeAttribute('data-font');
	}
}
