// @ts-nocheck
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { seedLogger } from '$lib/logger';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/**
 * Seed marketplace tables with starter apps.
 *
 * Includes:
 * - allowed file extensions
 * - apps
 * - app forms (dashboard + pages per app)
 * - app archives
 *
 * npx tsx src/lib/server/db/seed/marketplace-table-seed.ts
 */
export async function seedMarketplaceTables() {
	seedLogger.info('Seeding marketplace tables...');

	await db.execute(sql`
		INSERT INTO marketplace_allowed_file_extension (id, name, code, status_id)
		VALUES
			(1, 'APK', 'apk', 1),
			(2, 'IPA', 'ipa', 1),
			(3, 'EXE', 'exe', 1),
			(4, 'ZIP', 'zip', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: marketplace_allowed_file_extension');

	await db.execute(sql`
		INSERT INTO marketplace_app (id, name, code, signature, status_id)
		VALUES
			(1, 'Medora EMR Core', 'MEDORA_EMR_CORE', 'com.medora.emr.core', 1),
			(2, 'Medora Pharmacy', 'MEDORA_PHARMACY', 'com.medora.pharmacy', 1),
			(3, 'Medora Laboratory', 'MEDORA_LAB', 'com.medora.lab', 1),
			(4, 'Medora Billing', 'MEDORA_BILLING', 'com.medora.billing', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: marketplace_app');

	// Each app has a dashboard and multiple pages/forms.
	await db.execute(sql`
		INSERT INTO marketplace_app_form (id, name, code, app_id, status_id)
		VALUES
			(1, 'Dashboard', 'DASHBOARD', 1, 1),
			(2, 'Patient List', 'PATIENT_LIST', 1, 1),
			(3, 'Clinical Document', 'CLINICAL_DOCUMENT', 1, 1),
			(4, 'Dashboard', 'DASHBOARD', 2, 1),
			(5, 'Prescription Queue', 'PRESCRIPTION_QUEUE', 2, 1),
			(6, 'Dispense Counter', 'DISPENSE_COUNTER', 2, 1),
			(7, 'Dashboard', 'DASHBOARD', 3, 1),
			(8, 'Lab Orders', 'LAB_ORDERS', 3, 1),
			(9, 'Result Entry', 'RESULT_ENTRY', 3, 1),
			(10, 'Dashboard', 'DASHBOARD', 4, 1),
			(11, 'Invoice List', 'INVOICE_LIST', 4, 1),
			(12, 'Payment Collection', 'PAYMENT_COLLECTION', 4, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: marketplace_app_form');

	await db.execute(sql`
		INSERT INTO marketplace_app_archive (id, version, download_url, app_id, file_extension_id, status_id)
		VALUES
			(1, '1.0.0', 'https://mari-software.fly.dev/downloads/medora-emr-core-1.0.0.apk', 1, 1, 1),
			(2, '1.0.0', 'https://mari-software.fly.dev/downloads/medora-pharmacy-1.0.0.apk', 2, 1, 1),
			(3, '1.0.0', 'https://mari-software.fly.dev/downloads/medora-lab-1.0.0.apk', 3, 1, 1),
			(4, '1.0.0', 'https://mari-software.fly.dev/downloads/medora-billing-1.0.0.apk', 4, 1, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: marketplace_app_archive');

	seedLogger.info('Marketplace tables seeding completed');
}

seedMarketplaceTables()
	.then(() => {
		seedLogger.info('Marketplace table seeding finished');
		process.exit(0);
	})
	.catch((error) => {
		seedLogger.error(
			'Error while seeding marketplace tables',
			error instanceof Error ? error : new Error(String(error))
		);
		process.exit(1);
	});
