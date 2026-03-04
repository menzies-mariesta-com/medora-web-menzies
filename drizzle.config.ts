import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL)
	throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: [
		'./src/lib/server/db/table/auth-table/auth-table.ts',
		'./src/lib/server/db/table/master-table/master-table.ts',
		'./src/lib/server/db/table/information-table/information-table.ts'
	],
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
