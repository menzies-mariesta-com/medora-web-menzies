import { browser } from '$app/environment';
import type { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';
import { FontEnum } from '$lib/model/enum/font.enum';
import { LocalStorageEnum } from '$lib/model/enum/local-storage.enum';

export class FontTool {
	constructor(private localStorageUtil: LocalStorageUtil) {}

	checkFontExists(): boolean {
		return this.localStorageUtil.hasItem(LocalStorageEnum.FONT);
	}

	getFont(): FontEnum {
		const value = this.localStorageUtil.getItem<string>(
			LocalStorageEnum.FONT
		);

		if (
			value &&
			Object.values(FontEnum).includes(value as FontEnum)
		) {
			this.updateHtmlFont(value);
			return value as FontEnum;
		}

		// fallback
		const defaultFont = Object.values(FontEnum)[0] as FontEnum;
		if (browser) this.setFont(defaultFont);
		return defaultFont;
	}

	setFont(font: FontEnum): void {
		this.localStorageUtil.setItem(LocalStorageEnum.FONT, font);
		this.updateHtmlFont(font);
	}

	deleteFont(): void {
		const defaultFont = Object.values(FontEnum)[0] as FontEnum;

		if (this.checkFontExists()) {
			this.localStorageUtil.removeItem(LocalStorageEnum.FONT);
		}
		this.updateHtmlFont(defaultFont);
	}

	private updateHtmlFont(font: FontEnum | string): void {
		if (!browser) return;
		document.documentElement.setAttribute(
			'data-font',
			this.fontToHtml(font)
		);
	}

	private fontToHtml(font: FontEnum | string): string {
		return font
			.toLowerCase()
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join('');
	}
}
