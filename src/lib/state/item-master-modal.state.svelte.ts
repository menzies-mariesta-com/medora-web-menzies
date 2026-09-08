import type { ItemMasterListRow } from '$lib/model/type/medora/ui-rows.type';

/** Set before opening Create/Edit Item Master modal. */
export const ItemMasterModalState = $state<{
	mode: 'create' | 'edit';
	editItem: ItemMasterListRow | null;
}>({
	mode: 'create',
	editItem: null
});
