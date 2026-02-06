/// <reference types="vite/client" />
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
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
