import type { UnitMasterListRow } from '$lib/model/type/medora/ui-rows.type';

export const UnitMasterModalState = $state<{
	mode: 'create' | 'edit';
	editRow: UnitMasterListRow | null;
}>({
	mode: 'create',
	editRow: null
});
