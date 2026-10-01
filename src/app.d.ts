/// <reference types="vite/client" />
/// <reference types="@sveltejs/adapter-netlify" />

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from 'better-auth';

declare module '*?raw' {
	const text: string;
	export default text;
}
import type { StaffSessionRow } from '$lib/model/type/medora/staff.type';

declare global {
	/** Injected at build time by Vite from package.json (`vite.config` define). */
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			session?: Session | null;
			user?: User | null;
			/** Staff record linked to the logged-in user (1:1). */
			staff?: StaffSessionRow | null;
			/** User's role id (from user.role_id). Used for STAFF vs OWNER/SYSTEM_ADMIN/ADMIN_TEAM. */
			userRoleId?: number | null;
			/** better-auth twoFactor plugin: user has enrolled 2FA. */
			twoFactorEnabled?: boolean;
			/** When user is STAFF, only these hospital ids (UUIDs) are allowed; else null = all. */
			allowedHospitalIds?: string[] | null;
			/**
			 * ADMIN_TEAM per-page grants (null for SYSTEM_ADMIN = full access;
			 * undefined when not loaded / other roles).
			 */
			adminPermissions?: import('$lib/model/type/medora/admin-team.type').AdminPagePermissionFlags[] | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'd3';

export {};
