import { HOSPITAL_COLOR_CATEGORY } from '$lib/model/const/color-purpose.const';
import {
	badgeInlineStyleFromColor,
	resolveHospitalColor
} from '$lib/tool/color/hospital-color-resolve.util';

export function statusTaggingBadgeStyle(
	colorMap: Record<string, string> | null | undefined,
	statusTaggingId: number | null | undefined
): string | undefined {
	if (statusTaggingId == null) return undefined;
	const hex = resolveHospitalColor(
		colorMap,
		HOSPITAL_COLOR_CATEGORY.STATUS_TAGGING,
		String(statusTaggingId)
	);
	return badgeInlineStyleFromColor(hex);
}

export function bedStatusBadgeStyle(
	colorMap: Record<string, string> | null | undefined,
	bedStatus: number | null | undefined
): string | undefined {
	if (bedStatus == null) return undefined;
	const hex = resolveHospitalColor(
		colorMap,
		HOSPITAL_COLOR_CATEGORY.BED_STATUS,
		String(bedStatus)
	);
	return badgeInlineStyleFromColor(hex);
}