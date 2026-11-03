import type { ServiceTaggingSchema } from '$lib/server/db/schema-type';

function toDateOnly(value: string | null | undefined): string | null {
	const str = (value ?? '').trim();
	if (!str) return null;
	return str.length >= 10 ? str.slice(0, 10) : str;
}

export function isTaggingEffectiveOnDate(
	tagging: ServiceTaggingSchema,
	asOfDate: string
): boolean {
	const normalized = toDateOnly(asOfDate) ?? asOfDate;
	const validDate = toDateOnly(tagging.validDate);
	if (!validDate) return true;
	return validDate <= normalized;
}
