/**
 * @deprecated Prefer {@link LocaleCatalogEntry} /
 * {@link LocaleDisplayEntry} from `$lib/model/const/locale-catalog.const`.
 * Kept as a thin alias so older imports do not break.
 */
import type { LocaleDisplayEntry } from '$lib/model/const/locale-catalog.const';

/** Display metadata for a Paraglide / UI locale code. */
export type LocaleMeta = {
	/** ISO / Paraglide locale code (e.g. `ja`, `my`). */
	code: string;
	/** English language name (`englishName` in the catalog). */
	name: string;
	/** Endonym (name in that language). */
	nativeName: string;
	/** Emoji flag for the language's primary region. */
	flag: string;
};

export function toLocaleMeta(
	entry: LocaleDisplayEntry
): LocaleMeta {
	return {
		code: entry.code,
		name: entry.englishName,
		nativeName: entry.nativeName,
		flag: entry.flag
	};
}
