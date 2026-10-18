import type { ErWardRow } from '$lib/model/type/medora/er/er.type';

/** Set before opening Create/Edit ward modal. */
export const ErWardModalState = $state<{
	mode: 'create' | 'edit';
	editWard: ErWardRow | null;
}>({
	mode: 'create',
	editWard: null
});
