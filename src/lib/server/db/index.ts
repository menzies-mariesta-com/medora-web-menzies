import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const url = env.DATABASE_URL;

// During build (Docker / Vite), DATABASE_URL may be unset; don't hard‑fail there.
// We only enforce it when the DB is actually used.
if (!url && env.NODE_ENV === 'production') {
	console.warn('DATABASE_URL is not set');
}

let client: ReturnType<typeof neon> | null = null;
// Loosen the type here to avoid strict generic mismatch on Neon client options
let dbInternal: ReturnType<typeof drizzle> | null = null;

// If DATABASE_URL is present (e.g. at runtime on Fly), eagerly create the client/db.
// If it's missing (e.g. during remote Docker build), we just export `db = null`.
if (url) {
	client = neon(url);
	dbInternal = drizzle(client, { schema });
}

// Exported for existing imports: `import { db } from '$lib/server/db';`
export const db = dbInternal;

// Helper for places where you want an explicit runtime check.
export function ensureDb() {
	if (!url || !dbInternal) {
		throw new Error('DATABASE_URL is not set');
	}
	return dbInternal;
}

