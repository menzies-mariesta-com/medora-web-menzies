import { browser } from '$app/environment';
import { THEME_CHANGE_EVENT } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
import { FontEnum, WASH_FONT_STYLES } from '$lib/model/enum/font.enum';
import { LocalStorageEnum } from '$lib/model/enum/local-storage.enum';
import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

const DEFAULT_FONT = FontEnum.MAPLE_MONO;

/**
 * Applies Menzies Design font styles via `html[data-font]`.
 * CSS remaps `--font-sans` / `--font-mono` / `--font-display` (see font.style.css).
 * Independent of Wash pigment/`data-theme`: re-applied on every theme change so
 * typeface tokens stay correct for every Soft Wash theme.
 */
export class FontTool {
	private localStorageUtil = new LocalStorageUtil();
	private themeListener: (() => void) | undefined;

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
		if (!browser) return;
		this.apply(this.getFont());
		if (this.themeListener) return;
		this.themeListener = () => {
			this.apply(this.getFont());
		};
		window.addEventListener(THEME_CHANGE_EVENT, this.themeListener);
	}

	destroy(): void {
		if (!browser || !this.themeListener) return;
		window.removeEventListener(THEME_CHANGE_EVENT, this.themeListener);
		this.themeListener = undefined;
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
