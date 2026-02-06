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
let db: ReturnType<typeof drizzle> | null = null;

export function ensureDb() {
	if (!url) {
		throw new Error('DATABASE_URL is not set');
	}
	if (!client || !db) {
		client = neon(url);
		db = drizzle(client, { schema });
	}
	return db;
}

