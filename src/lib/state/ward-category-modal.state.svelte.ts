import type { WardCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';

/** Set before opening Create/Edit ward category modal. */
export const WardCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: WardCategoryRow | null;
}>({
	mode: 'create',
	editCategory: null
});
