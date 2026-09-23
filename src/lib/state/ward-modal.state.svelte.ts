import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';

/** Set before opening Create/Edit ward modal. */
export const WardModalState = $state<{
	mode: 'create' | 'edit';
	editWard: WardRow | null;
}>({
	mode: 'create',
	editWard: null
});
