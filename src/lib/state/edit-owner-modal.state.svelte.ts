import type { UserSchema } from '$lib/server/db/schema-type';

/** Set before opening Edit Owner modal. */
export const EditOwnerModalState = $state<{ owner: UserSchema | null }>({ owner: null });
