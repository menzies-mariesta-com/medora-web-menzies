import type { StoreSchema } from '$lib/server/db/schema-type';

/** Set before opening Create/Edit store modal (hospital-scoped). */
export const StoreModalState = $state<{
	mode: 'create' | 'edit';
	editStore: StoreSchema | null;
	hospitalId: string;
}>({
	mode: 'create',
	editStore: null,
	hospitalId: ''
});
