import type { WardCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';
import type { UnifiedCategoryListRow } from '$lib/tool/medora/administration-master-scope.util';

/** Set before opening Create/Edit ward category modal. */
export const WardCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: (WardCategoryRow & UnifiedCategoryListRow) | null;
	isEr: boolean;
}>({
	mode: 'create',
	editCategory: null,
	isEr: false
});
