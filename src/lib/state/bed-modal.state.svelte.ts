import type { BedRow } from '$lib/model/type/medora/ipd/ipd.type';

/** Set before opening Create/Edit bed modal. */
export const BedModalState = $state<{
	mode: 'create' | 'edit';
	editBed: BedRow | null;
}>({
	mode: 'create',
	editBed: null
});
