import type { UserListRow } from '$lib/model/type/heka/ui-rows.type';

/** Set before opening Edit Owner modal. */
export const EditOwnerModalState = $state<{
	owner: UserListRow | null;
}>({ owner: null });
