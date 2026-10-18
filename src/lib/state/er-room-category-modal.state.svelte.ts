import type { ErRoomCategoryRow } from '$lib/model/type/medora/er/er.type';

/** Set before opening Create/Edit room category modal. */
export const ErRoomCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: ErRoomCategoryRow | null;
}>({
	mode: 'create',
	editCategory: null
});
