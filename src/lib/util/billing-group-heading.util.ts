/** Display label for bill line groups: `Category | Sub category`. */
export function formatBillingCategorySubCategoryHeading(input: {
	categoryName?: string | null;
	subCategoryName?: string | null;
	fallbackSubCategory?: string;
}): string {
	const subFallback = input.fallbackSubCategory?.trim() || 'Other';
	const sub = (input.subCategoryName ?? '').trim() || subFallback;
	const cat = (input.categoryName ?? '').trim() || '—';
	return `${cat} | ${sub}`;
}
