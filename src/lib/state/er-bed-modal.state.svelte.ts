import type { ErBedRow } from '$lib/model/type/medora/er/er.type';

/** Set before opening Create/Edit bed modal. */
export const ErBedModalState = $state<{
	mode: 'create' | 'edit';
	editBed: ErBedRow | null;
}>({
	mode: 'create',
	editBed: null
});
