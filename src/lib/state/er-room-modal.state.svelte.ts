import type { ErRoomRow } from '$lib/model/type/medora/er/er.type';

/** Set before opening Create/Edit room modal. */
export const ErRoomModalState = $state<{
	mode: 'create' | 'edit';
	editRoom: ErRoomRow | null;
}>({
	mode: 'create',
	editRoom: null
});
