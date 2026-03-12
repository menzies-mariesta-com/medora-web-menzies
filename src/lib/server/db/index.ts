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

// ensureDb() returns this singleton every time — no new connection per call.
// For better performance use Neon's pooled connection string (host with `-pooler`,
// e.g. ep-xxx-pooler.region.aws.neon.tech) so PgBouncer pools connections server-side.
let client: ReturnType<typeof neon> | null = null;
/** Db instance type including schema so that e.g. ensureDb().query.pageTable is typed. */
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
let dbInternal: DbInstance | null = null;

// If DATABASE_URL is present (e.g. at runtime on Fly), eagerly create the client/db.
// If it's missing (e.g. during remote Docker build), we just export `db = null`.
if (url) {
	client = neon(url);
	dbInternal = drizzle(client, { schema }) as DbInstance;
}

// Exported for existing imports: `import { db } from '$lib/server/db';`
export const db = dbInternal;

/** Returns the shared db instance. No connection is created per call (singleton). */
export function ensureDb(): DbInstance {
	if (!url || !dbInternal) {
		throw new Error('DATABASE_URL is not set');
	}
	return dbInternal;
}
