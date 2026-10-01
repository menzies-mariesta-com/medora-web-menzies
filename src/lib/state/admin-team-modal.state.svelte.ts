import type { AdminTeamMember } from '$lib/model/type/medora/admin-team.type';

class AdminTeamModalStateClass {
	member = $state<AdminTeamMember | null>(null);
}

export const AdminTeamModalState = new AdminTeamModalStateClass();
