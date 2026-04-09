import type { ItemUnitMasterListRow } from '$lib/model/type/heka/ui-rows.type';

export const ItemUnitMasterModalState = $state<{
	mode: 'create' | 'edit';
	editRow: ItemUnitMasterListRow | null;
}>({
	mode: 'create',
	editRow: null
});
