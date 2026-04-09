import type { StoreListRow } from '$lib/model/type/heka/ui-rows.type';

/** Set before opening Create/Edit store modal (hospital-scoped). */
export const StoreModalState = $state<{
	mode: 'create' | 'edit';
	editStore: StoreListRow | null;
	hospitalId: string;
}>({
	mode: 'create',
	editStore: null,
	hospitalId: ''
});
