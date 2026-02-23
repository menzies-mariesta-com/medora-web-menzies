import type { UserGroupSchema } from '$lib/server/db/schema-type';

/** Set before opening Create/Edit user group modal. */
export const UserGroupModalState = $state<{
	mode: 'create' | 'edit';
	editGroup: UserGroupSchema | null;
	hospitalId: string;
}>({
	mode: 'create',
	editGroup: null,
	hospitalId: ''
});
