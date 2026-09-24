import type { RoomCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';

/** Set before opening Create/Edit room category modal. */
export const RoomCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: RoomCategoryRow | null;
}>({
	mode: 'create',
	editCategory: null
});
