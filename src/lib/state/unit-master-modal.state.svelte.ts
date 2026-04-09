import type { UnitMasterListRow } from '$lib/model/type/heka/ui-rows.type';

export const UnitMasterModalState = $state<{
	mode: 'create' | 'edit';
	editRow: UnitMasterListRow | null;
}>({
	mode: 'create',
	editRow: null
});
