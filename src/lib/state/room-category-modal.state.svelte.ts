import type { RoomCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';
import type { UnifiedCategoryListRow } from '$lib/tool/medora/administration-master-scope.util';

/** Set before opening Create/Edit room category modal. */
export const RoomCategoryModalState = $state<{
	mode: 'create' | 'edit';
	editCategory: (RoomCategoryRow & UnifiedCategoryListRow) | null;
	isEr: boolean;
}>({
	mode: 'create',
	editCategory: null,
	isEr: false
});
