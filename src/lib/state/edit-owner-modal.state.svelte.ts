import type { UserListRow } from '$lib/model/type/medora/ui-rows.type';

/** Set before opening Edit Owner modal. */
export const EditOwnerModalState = $state<{
	owner: UserListRow | null;
}>({ owner: null });
