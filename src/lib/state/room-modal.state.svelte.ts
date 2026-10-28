import type { RoomRow } from '$lib/model/type/medora/ipd/ipd.type';

export type RoomModalEditRow = RoomRow & { isEr?: boolean };

/** Set before opening Create/Edit room modal. */
export const RoomModalState = $state<{
	mode: 'create' | 'edit';
	editRoom: RoomModalEditRow | null;
	isEr: boolean;
}>({
	mode: 'create',
	editRoom: null,
	isEr: false
});
