import type { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';
import { FontEnum } from '$lib/model/enum/font.enum';
import { LocalStorageEnum } from '$lib/model/enum/local-storage.enum';

export class FontTool {
	constructor(private localStorageUtil: LocalStorageUtil) {}

	checkFontExists(): boolean {
		return this.localStorageUtil.hasItem(LocalStorageEnum.FONT);
	}

	/**
	 * Font picker is disabled while Wash owns typography (`--font-display` / `--font-sans`).
	 * Kept as a no-op so callers do not fight Wash fonts via `data-font`.
	 */
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
		return Object.values(FontEnum)[0] as FontEnum;
	}

	setFont(font: FontEnum): void {
		this.localStorageUtil.setItem(LocalStorageEnum.FONT, font);
		// Intentionally do not set data-font — Wash styles own typefaces.
	}

	deleteFont(): void {
		if (this.checkFontExists()) {
			this.localStorageUtil.removeItem(LocalStorageEnum.FONT);
		}
	}
}
