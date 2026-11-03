/** Nav pages that render real content (not index stubs) despite having tab children. */
export const MEDORA_SECTION_INDEX_REDIRECT_EXEMPT_PAGE_URLS = new Set([
	'/medora/home/billing/bill',
	'/medora/home/billing/advance-deposit'
]);

export function isMedoraSectionIndexRedirectExempt(
	dbPageUrl: string | null | undefined
): boolean {
	const path = (dbPageUrl ?? '').replace(/\/$/, '') || '/';
	return MEDORA_SECTION_INDEX_REDIRECT_EXEMPT_PAGE_URLS.has(path);
}
