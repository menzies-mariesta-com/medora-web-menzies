import type { StaffRegUserGroupRow } from '$lib/model/type/heka/staff-reg-ui.type';

/** Set before opening Create/Edit user group modal. */
export const UserGroupModalState = $state<{
	mode: 'create' | 'edit';
	editGroup: StaffRegUserGroupRow | null;
	hospitalId: string;
}>({
	mode: 'create',
	editGroup: null,
	hospitalId: ''
});
