/// <reference types="vite/client" />

/** Injected at build time by Vite from package.json */
declare const __APP_VERSION__: string;
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from 'better-auth';

declare module '*?raw' {
	const text: string;
	export default text;
}
import type { StaffSchema } from '$lib/server/db/table/information-table/information-table-schema-type';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Session | null;
			user?: User | null;
			/** Staff record linked to the logged-in user (1:1). */
			staff?: StaffSchema | null;
			/** User's role id (from user.role_id). Used for STAFF vs OWNER/SYSTEM_ADMIN. */
			userRoleId?: number | null;
			/** When user is STAFF, only these hospital ids (UUIDs) are allowed; else null = all. */
			allowedHospitalIds?: string[] | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'd3';

export {};
