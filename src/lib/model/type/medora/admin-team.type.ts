import type { AdminPageKeyEnum } from '$lib/model/enum/db-link';

/** CRUD flags for one admin page (HTTP contract). */
export type AdminPagePermissionFlags = {
	pageKey: AdminPageKeyEnum | string;
	canView: boolean;
	canCreate: boolean;
	canEdit: boolean;
	canDelete: boolean;
};

/** Admin team member row for list/detail APIs. */
export type AdminTeamMember = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
	permissions: AdminPagePermissionFlags[];
};

/** Invite / create payload. */
export type AdminTeamInvitePayload = {
	name: string;
	email: string;
	permissions: AdminPagePermissionFlags[];
};

/** Update name + permissions payload. */
export type AdminTeamUpdatePayload = {
	name?: string;
	permissions: AdminPagePermissionFlags[];
};
