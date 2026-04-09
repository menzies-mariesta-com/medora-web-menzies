import type { PharmacyGenericListRow } from '$lib/model/type/heka/ui-rows.type';

/** Set before opening Create/Edit Pharmacy Generic modal. */
export const PharmacyGenericModalState = $state<{
	mode: 'create' | 'edit';
	editRow: PharmacyGenericListRow | null;
}>({
	mode: 'create',
	editRow: null
});
