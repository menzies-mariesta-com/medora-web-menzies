import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';

export type WardModalEditRow = WardRow & { isEr?: boolean };

/** Set before opening Create/Edit ward modal. */
export const WardModalState = $state<{
	mode: 'create' | 'edit';
	editWard: WardModalEditRow | null;
	isEr: boolean;
}>({
	mode: 'create',
	editWard: null,
	isEr: false
});
