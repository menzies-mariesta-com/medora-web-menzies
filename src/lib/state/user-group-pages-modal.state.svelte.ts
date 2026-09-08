import type { StaffRegUserGroupRow } from '$lib/model/type/medora/staff-reg-ui.type';

/** Set before opening Manage pages modal for a user group. */
export const UserGroupPagesModalState = $state<{
	group: StaffRegUserGroupRow | null;
}>({ group: null });
