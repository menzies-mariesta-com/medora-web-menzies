import type { ItemMasterSchema } from '$lib/server/db/schema-type';

/** Set before opening Create/Edit Item Master modal. */
export const ItemMasterModalState = $state<{
	mode: 'create' | 'edit';
	editItem: ItemMasterSchema | null;
}>({
	mode: 'create',
	editItem: null
});
