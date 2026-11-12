import type { BedRow } from '$lib/model/type/medora/ipd/ipd.type';

export type BedModalEditRow = BedRow & { isEr?: boolean };

/** Set before opening Create/Edit bed modal. */
export const BedModalState = $state<{
	mode: 'create' | 'edit';
	editBed: BedModalEditRow | null;
	isEr: boolean;
}>({
	mode: 'create',
	editBed: null,
	isEr: false
});
