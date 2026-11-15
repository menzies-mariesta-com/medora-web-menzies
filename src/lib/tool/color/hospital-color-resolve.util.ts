import {
	defaultColorFor,
	findCatalogEntry,
	hospitalColorMapKey,
	HOSPITAL_COLOR_CATEGORY,
	STATIC_COLOR_CATALOG,
	type ColorCatalogEntry
} from '$lib/model/const/color-purpose.const';
import { daisyUiTokenToHex } from '$lib/tool/color/color-daisyui-default.util';

export function buildResolvedColorMap(
	configured: { category: string; entityKey: string; color: string }[]
): Record<string, string> {
	const map: Record<string, string> = {};
	for (const row of configured) {
		map[hospitalColorMapKey(row.category, row.entityKey)] = row.color;
	}
	for (const entry of STATIC_COLOR_CATALOG) {
		const key = hospitalColorMapKey(entry.category, entry.entityKey);
		if (map[key] == null) map[key] = entry.defaultColor;
	}
	return map;
}

export function resolveHospitalColor(
	resolvedMap: Record<string, string> | null | undefined,
	category: string,
	entityKey: string
): string {
	const key = hospitalColorMapKey(category, entityKey);
	const fromMap = resolvedMap?.[key];
	if (fromMap) return daisyUiTokenToHex(fromMap);
	return defaultColorFor(category, entityKey);
}

export function resolveStatusTaggingColor(
	resolvedMap: Record<string, string> | null | undefined,
	statusTaggingId: number
): string {
	return resolveHospitalColor(
		resolvedMap,
		HOSPITAL_COLOR_CATEGORY.STATUS_TAGGING,
		String(statusTaggingId)
	);
}

export function resolveVisitTypeBorderColor(
	resolvedMap: Record<string, string> | null | undefined,
	visitTypeId: number | null | undefined
): string | null {
	if (visitTypeId == null) return null;
	return resolveHospitalColor(
		resolvedMap,
		HOSPITAL_COLOR_CATEGORY.VISIT_TYPE,
		String(visitTypeId)
	);
}

export function badgeInlineStyleFromColor(hex: string): string {
	const c = daisyUiTokenToHex(hex);
	return [
		`background-color: color-mix(in srgb, ${c} 14%, transparent)`,
		`border-color: color-mix(in srgb, ${c} 35%, transparent)`,
		`color: ${c}`
	].join('; ');
}

export function borderLeftStyleFromColor(hex: string, widthPx = 4): string {
	const c = daisyUiTokenToHex(hex);
	return `border-left-width: ${widthPx}px; border-left-style: solid; border-left-color: ${c};`;
}

export function triageRibbonStyle(hex: string): string {
	const c = daisyUiTokenToHex(hex);
	return `background-color: ${c};`;
}

export function catalogEntryForStatusTagging(
	statusTaggingId: number
): ColorCatalogEntry | undefined {
	return findCatalogEntry(
		HOSPITAL_COLOR_CATEGORY.STATUS_TAGGING,
		String(statusTaggingId)
	);
}