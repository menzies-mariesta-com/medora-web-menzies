import { defineConfig } from 'drizzle-kit';
import { ensureDatabaseUrl } from './src/lib/server/db/ensure-database-url';

const databaseUrl = ensureDatabaseUrl();

export default defineConfig({
	schema: [
		'./src/lib/server/db/table/auth-table/auth-table.ts',
		'./src/lib/server/db/table/master-table/master-table.ts',
		'./src/lib/server/db/table/information-table/information-table.ts',
		'./src/lib/server/db/table/information-table/inventory-transaction-table.ts',
		'./src/lib/server/db/table/information-table/medication-order-table.ts',
		'./src/lib/server/db/table/information-table/er-master-table.ts',
		'./src/lib/server/db/table/information-table/perioperative-table.ts',
		'./src/lib/server/db/table/information-table/clinical-platform-table.ts',
		'./src/lib/server/db/table/information-table/rxnorm-table.ts',
		'./src/lib/server/db/table/information-table/diagnostics-table.ts',
		'./src/lib/server/db/table/information-table/document-catalog-table.ts',
		'./src/lib/server/db/table/patient-portal-table/patient-portal-table.ts',
		'./src/lib/server/db/table/plan-table/plan-table.ts',
		'./src/lib/server/db/table/notification-table/notification-table.ts',
		'./src/lib/server/db/table/marketplace-table/marketplace-table.ts'
	],
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
