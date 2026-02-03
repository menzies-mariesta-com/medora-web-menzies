import { browser } from '$app/environment';
import { LocalStorageEnum } from '$lib/model/enum/local-storage.enum';
import { ThemeEnum } from '$lib/model/enum/theme.enum';
import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';

export class ThemeTool {
	constructor(private localStorageUtil: LocalStorageUtil) { }

	/**
	 * Check if theme is stored
	 */
	checkThemeExists(): boolean {
		return this.localStorageUtil.hasItem(LocalStorageEnum.THEME);
	}

	/**
	 * Get the current theme
	 */
	getTheme(): ThemeEnum {
		const value = this.localStorageUtil.getItem<string>(
			LocalStorageEnum.THEME
		);
		if (
			value &&
			Object.values(ThemeEnum).includes(value as ThemeEnum)
		) {
			this.updateHtmlTheme(value);
			return value as ThemeEnum;
		}

		// Fallback to default theme
		const defaultTheme = Object.values(ThemeEnum)[0] as ThemeEnum;
		if (browser) this.setTheme(defaultTheme);
		return defaultTheme;
	}

	/**
	 * Set / Save theme and update <html> attribute
	 */
	setTheme(theme: ThemeEnum): void {
		this.localStorageUtil.setItem(LocalStorageEnum.THEME, theme);
		this.updateHtmlTheme(theme);
	}

	/**
	 * Delete theme and reset <html> attribute
	 */
	deleteTheme(): void {
		if (this.checkThemeExists()) {
			this.localStorageUtil.removeItem(LocalStorageEnum.THEME);
		}
		// Reset to LIGHT as safe default
		this.updateHtmlTheme(ThemeEnum.LIGHT);
	}

	/**
	 * Update the <html> data-theme attribute
	 */
	private updateHtmlTheme(theme: ThemeEnum | string): void {
		if (!browser) return;
		document.documentElement.setAttribute('data-theme', theme);
	}
}
