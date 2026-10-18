import type { ErWardCategoryRow } from '$lib/model/type/medora/er/er.type';

/** Set before opening Create/Edit ward category modal. */
export const ErWardCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: ErWardCategoryRow | null;
}>({
	mode: 'create',
	editCategory: null
});
