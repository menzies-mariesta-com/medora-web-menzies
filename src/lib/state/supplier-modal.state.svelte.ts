import type { SupplierListRow } from '$lib/model/type/heka/ui-rows.type';

export const SupplierModalState = $state<{
	mode: 'create' | 'edit';
	editRow: SupplierListRow | null;
}>({
	mode: 'create',
	editRow: null
});
