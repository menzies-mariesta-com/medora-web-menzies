/**
 * @deprecated Prefer `$lib/model/const/locale-catalog.const` as the
 * single source of truth for locale display metadata.
 * This module re-exports catalog helpers so older imports do not drift.
 */
import {
	LOCALE_CATALOG,
	formatLocaleAriaLabel as catalogAriaLabel,
	formatLocaleLabel,
	resolveLocaleCatalogEntry,
	type LocaleDisplayEntry
} from '$lib/model/const/locale-catalog.const';
import {
	toLocaleMeta,
	type LocaleMeta
} from '$lib/model/type/locale-meta.type';

export const LOCALE_META: Readonly<Record<string, LocaleMeta>> =
	Object.fromEntries(
		LOCALE_CATALOG.map((entry) => [entry.code, toLocaleMeta(entry)])
	);

/** Fallback when a locale exists in Paraglide but is missing from the map. */
export function getLocaleMeta(code: string): LocaleMeta {
	return toLocaleMeta(resolveLocaleCatalogEntry(code));
}

/** Select / list label: flag + endonym, with English when different. */
export function formatLocaleOptionLabel(meta: LocaleMeta): string {
	const entry: LocaleDisplayEntry = {
		code: meta.code,
		englishName: meta.name,
		nativeName: meta.nativeName,
		flag: meta.flag
	};
	return formatLocaleLabel(entry);
}

/** Accessible name without relying on emoji alone. */
export function formatLocaleAriaLabel(meta: LocaleMeta): string {
	const entry: LocaleDisplayEntry = {
		code: meta.code,
		englishName: meta.name,
		nativeName: meta.nativeName,
		flag: meta.flag
	};
	return catalogAriaLabel(entry);
}
