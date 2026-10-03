/**
 * Legacy named aliases for common locales.
 * Prefer {@link LocaleCode} / {@link LOCALE_CATALOG} as the source of truth;
 * any configured locale string is valid for LanguageTool / the picker.
 */
import type { LocaleCode } from '$lib/model/const/locale-catalog.const';

export enum LanguageEnum {
	ENGLISH = 'en',
	HINDI = 'hi',
	JAPAN = 'ja',
	KOREAN = 'ko',
	MYANMAR = 'my',
	CHINESE_SIMPLIFIED = 'zh-cn',
	CHINESE_TRADITIONAL = 'zh-tw',
	SPANISH = 'es',
	FRENCH = 'fr',
	GERMAN = 'de',
	PORTUGUESE_BRAZIL = 'pt-br',
	PORTUGUESE = 'pt',
	ARABIC = 'ar',
	RUSSIAN = 'ru',
	ITALIAN = 'it',
	TURKISH = 'tr',
	VIETNAMESE = 'vi',
	THAI = 'th',
	INDONESIAN = 'id',
	MALAY = 'ms',
	DUTCH = 'nl',
	POLISH = 'pl',
	UKRAINIAN = 'uk',
	BENGALI = 'bn',
	TAMIL = 'ta',
	TELUGU = 'te',
	MARATHI = 'mr',
	GUJARATI = 'gu',
	KANNADA = 'kn',
	MALAYALAM = 'ml',
	PUNJABI = 'pa',
	SWAHILI = 'sw',
	PERSIAN = 'fa',
	HEBREW = 'he',
	SWEDISH = 'sv',
	FINNISH = 'fi',
	NORWEGIAN_BOKMAL = 'nb',
	DANISH = 'da',
	GREEK = 'el',
	CZECH = 'cs'
}

/** Any Paraglide-configured locale (catalog code), including codes beyond LanguageEnum. */
export type AppLocale = LocaleCode | LanguageEnum | (string & {});
