import type { UserGroupSchema } from '$lib/server/db/schema-type';

/** Set before opening Manage pages modal for a user group. */
export const UserGroupPagesModalState = $state<{ group: UserGroupSchema | null }>({ group: null });
