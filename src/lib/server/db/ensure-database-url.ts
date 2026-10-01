import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

/**
 * Ensure `DATABASE_URL` is available for CLI seeds / drizzle-kit.
 * Loads `.env` from the project cwd when the var is not already set
 * (so you do not need `export DATABASE_URL=...` before every seed).
 */
export function ensureDatabaseUrl(): string {
	if (!process.env.DATABASE_URL?.trim()) {
		const envPath = resolve(process.cwd(), '.env');
		if (existsSync(envPath)) {
			loadEnvFile(envPath);
		}
	}
	const url = process.env.DATABASE_URL?.trim();
	if (!url) {
		throw new Error(
			'DATABASE_URL is not set. Add it to .env in the project root (or export it).'
		);
	}
	return url;
}
