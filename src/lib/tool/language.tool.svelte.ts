import {
	LanguageEnum,
	type AppLocale
} from '$lib/model/enum/language.enum';
import { isLocaleCode } from '$lib/model/const/locale-catalog.const';
import { setLocale, getLocale } from '$lib/paraglide/runtime';

export class LanguageTool {
	getLanguage(): AppLocale {
		const locale = getLocale();
		if (!locale || !isLocaleCode(locale)) {
			this.setDefaultLanguage();
			return LanguageEnum.ENGLISH;
		}
		return locale;
	}

	setDefaultLanguage() {
		this.changeLanguage(LanguageEnum.ENGLISH);
	}

	changeLanguage(language: AppLocale) {
		if (!isLocaleCode(language)) return;
		setLocale(language);
	}
}
