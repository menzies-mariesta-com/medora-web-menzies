/** Set before opening hospital modal: null = create, string (UUID) = edit that hospital. */
export const HospitalModalState = $state<{
	hospitalId: string | null;
	/** Current user's role (e.g. OWNER) so modal can lock ownerId. */
	currentUserRoleId?: number;
	/** Current user's id; when role is OWNER, ownerId is forced to this. */
	currentUserId?: string;
}>({ hospitalId: null });
