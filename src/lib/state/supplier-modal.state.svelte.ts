import type { SupplierListRow } from '$lib/model/type/medora/ui-rows.type';

export const SupplierModalState = $state<{
	mode: 'create' | 'edit';
	editRow: SupplierListRow | null;
}>({
	mode: 'create',
	editRow: null
});
