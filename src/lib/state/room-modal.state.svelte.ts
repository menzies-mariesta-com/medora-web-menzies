import type { RoomRow } from '$lib/model/type/medora/ipd/ipd.type';

/** Set before opening Create/Edit room modal. */
export const RoomModalState = $state<{
	mode: 'create' | 'edit';
	editRoom: RoomRow | null;
}>({
	mode: 'create',
	editRoom: null
});
