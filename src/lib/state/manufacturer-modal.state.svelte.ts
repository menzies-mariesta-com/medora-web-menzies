import type { ManufacturerListRow } from '$lib/model/type/heka/ui-rows.type';

export const ManufacturerModalState = $state<{
	mode: 'create' | 'edit';
	editRow: ManufacturerListRow | null;
}>({
	mode: 'create',
	editRow: null
});
