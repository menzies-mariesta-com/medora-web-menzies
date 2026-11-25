import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { seedLogger } from '$lib/logger';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import {
	invalidateCacheKey,
	invalidateCacheTag
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';
import {
	importWhoIcdSystems,
	isWhoIcdSeedSkipped,
	resolveWhoIcdSeedSystems,
	WhoIcdCredentialsError
} from '$lib/server/medora/clinical/who-icd-import.server';
import { importIcd10CmCatalogue } from '$lib/server/medora/clinical/icd10-cm-import.server';
import {
	importSnomedRf2Catalogue,
	isSnomedSeedSkipped,
	SnomedRf2ImportError
} from '$lib/server/medora/clinical/snomed-rf2-import.server';

const client = neon(ensureDatabaseUrl());
const db = drizzle(client);

/**
 * Seed static information / reference data for init (modules, pages, status tagging,
 * document templates, allergy lookup, ED triage levels per hospital).
 *
 * Run after master-table-seed. Inserts in FK-safe order.
 *
 * Does **not** seed demo patients, staff, service items, inventory, ER demo beds, or
 * transactional visits — use scripts under `src/lib/server/db/seed/demo/` (`pnpm db:seed:demo:*`).
 *
 * **Diagnosis catalogues:** optional WHO ICD (`WHO_ICD_*`), ICD-10-CM (`ICD10_CM_SEED=1`),
 * SNOMED CT (`SNOMED_RF2_DIR`). Use `WHO_ICD_SEED_SYSTEM=ICD10|ICD11|BOTH` to import one WHO edition.
 * Set `WHO_ICD_SKIP_SEED=1` / `SNOMED_SKIP_SEED=1` to skip.
 *
 * Per-hospital **`item_master`** catalog rows are **not** seeded here (created via the app).
 * Global documents: code catalog via `document-master-provision.seed` (per active hospital).
 *
 * **Insert-only:** reference rows only (`INSERT` / `ON CONFLICT` upsert). Schema via `pnpm db:push`.
 *
 * npx tsx src/lib/server/db/seed/init/information-table-seed.ts
 */
export async function seedInformationTables() {
	seedLogger.info('Seeding information tables...');

	// 1. Modules (depends: status)
	// image_url = Lucide kebab-case name (Menzies Design / Wash DynamicIcon naming).
	await db.execute(sql`
		INSERT INTO module (id, name, sequence_no, status_id, module_url, image_url)
		VALUES
			(1, 'Administration', 1, 1, '/medora/home/administration', 'user-cog'),
			(2, 'Registration', 2, 1, '/medora/home/registration', 'users-round'),
			(3, 'Appointment', 3, 1, '/medora/home/appointment', 'clipboard-clock'),
			(4, 'Nursing Workbench', 4, 1, '/medora/home/nursing-workbench', 'heart-pulse'),
			(5, 'Service Item', 5, 1, '/medora/home/service-item', 'clipboard-list'),
			(6, 'Consultation', 6, 1, '/medora/home/consultation', 'stethoscope'),
			(7, 'ADT', 7, 1, '/medora/home/adt', 'bed-double'),
			(8, 'Billing', 8, 1, '/medora/home/billing/bill', 'receipt-text'),
			(9, 'Inventory Setup', 9, 1, '/medora/home/inventory-setup', 'warehouse'),
			(10, 'Inventory', 10, 1, '/medora/home/inventory', 'package'),
			(11, 'Medication Order', 11, 1, '/medora/home/medication-order', 'pill'),
			(12, 'Emergency', 12, 1, '/medora/home/emergency', 'siren'),
			(13, 'Perioperative', 13, 1, '/medora/home/perioperative', 'scalpel'),
			(14, 'Obstetrics', 14, 1, '/medora/home/obstetrics', 'baby'),
			(15, 'Diagnostics', 15, 1, '/medora/home/diagnostics', 'activity')
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			sequence_no = EXCLUDED.sequence_no,
			status_id = EXCLUDED.status_id,
			module_url = EXCLUDED.module_url,
			image_url = EXCLUDED.image_url,
			updated_at = now();
	`);
	seedLogger.info('Seeded: module');

	// 2. Hospital (depends: status). id is UUID.
	// await db.execute(sql`
	// 	INSERT INTO hospital (id, name, code, city_id, state_id, country_id, status_id)
	// 	VALUES
	// 		('01900000-0000-7000-8000-000000000001'::uuid, 'Pun Hlaing Hospitals', 'phh', 1, 1, 118, 1)
	// 	ON CONFLICT (id) DO NOTHING;
	// `);
	// seedLogger.info('Seeded: hospital');

	// 2b. Financial year (per hospital) and prefix configuration seeds can be added here later per environment.

	// 3. Page (depends: module, status)
	// Page ids: top-level page n (1-based) → module×100000 + n×100 (100100, 100200, …); sub-page s (1-based) → parent + s (100101, 100102, …; never parent+0).
	await db.execute(sql`
		INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
		VALUES
			-- ── Module 1: Administration ──
			(100100, 'Staff', 1, 1, null, '/medora/home/administration/staff', 1),
			(100101, 'Staff Registration', 1, 1, 100100, '/medora/home/administration/staff/registration', 1),
			(100102, 'Staff List', 1, 1, 100100, '/medora/home/administration/staff/list', 2),
			(100200, 'Schedule Master', 1, 1, null, '/medora/home/administration/schedule-master', 1),
			(100201, 'Doctor Schedule', 1, 1, 100200, '/medora/home/administration/schedule-master/doctor-schedule', 1),
			(100300, 'External Refer Master', 1, 1, null, '/medora/home/administration/external-refer-master', 1),
			(100400, 'User Group', 1, 1, null, '/medora/home/administration/user-group', 4),
			(100500, 'Branches', 1, 1, null, '/medora/home/administration/branches', 5),
			(100600, 'Service Order', 1, 1, null, '/medora/home/administration/service-order', 6),
			(100601, 'Category Master', 1, 1, 100600, '/medora/home/administration/service-order/category-master', 1),
			(100602, 'Sub Category Master', 1, 1, 100600, '/medora/home/administration/service-order/sub-category-master', 2),
			(100603, 'Service Item Master', 1, 1, 100600, '/medora/home/administration/service-order/service-item-master', 3),
			(100604, 'Service Item Tagging', 1, 1, 100600, '/medora/home/administration/service-order/service-item-tagging', 4),
			(100700, 'Document Master', 1, 1, null, '/medora/home/administration/document-master', 7),
			(100701, 'Document Type', 1, 1, 100700, '/medora/home/administration/document-master/document-type', 1),
			(100702, 'Document', 1, 1, 100700, '/medora/home/administration/document-master/document', 2),
			(100703, 'Document Setting', 1, 1, 100700, '/medora/home/administration/document-master/document-setting', 3),
			(100706, 'Placeholder setup', 1, 1, 100700, '/medora/home/administration/document-master/placeholder-setup', 4),
			(100707, 'Reusable Global Documents', 1, 1, 100700, '/medora/home/administration/document-master/reusable-global-documents', 5),
			(100800, 'Financial Year', 1, 1, null, '/medora/home/administration/financial-year', 8),
			(100900, 'Prefix Configuration', 1, 1, null, '/medora/home/administration/prefix-configuration', 9),
			(100905, 'Color Configuration', 1, 1, null, '/medora/home/administration/color-configuration', 10),
			(101000, 'Departments', 1, 1, null, '/medora/home/administration/departments', 10),
			(101100, 'Medication Order Setup', 1, 1, null, '/medora/home/administration/medication-order-setup', 12),
			(101101, 'Frequency', 1, 1, 101100, '/medora/home/administration/medication-order-setup/frequency', 1),
			(101102, 'Form', 1, 1, 101100, '/medora/home/administration/medication-order-setup/form', 2),
			(101103, 'Route', 1, 1, 101100, '/medora/home/administration/medication-order-setup/route', 3),
			(101104, 'Duration unit', 1, 1, 101100, '/medora/home/administration/medication-order-setup/duration', 4),
			(101105, 'Order type', 1, 1, 101100, '/medora/home/administration/medication-order-setup/order-type', 5),
			(101106, 'Dose unit', 1, 1, 101100, '/medora/home/administration/medication-order-setup/dose-unit', 6),
			(101107, 'Food relation', 1, 1, 101100, '/medora/home/administration/medication-order-setup/food-relation', 7),
			(101200, 'Ward Master', 1, 1, null, '/medora/home/administration/ward-master', 13),
			(101201, 'Ward Category', 1, 1, 101200, '/medora/home/administration/ward-master/ward-category', 1),
			(101202, 'Ward', 1, 1, 101200, '/medora/home/administration/ward-master/ward', 2),
			(101300, 'Room Master', 1, 1, null, '/medora/home/administration/room-master', 14),
			(101301, 'Room Category', 1, 1, 101300, '/medora/home/administration/room-master/room-category', 1),
			(101302, 'Room', 1, 1, 101300, '/medora/home/administration/room-master/room', 2),
			(101400, 'Bed Master', 1, 1, null, '/medora/home/administration/bed-master', 15),
			(101500, 'Billing Setup', 1, 1, null, '/medora/home/administration/billing-setup', 16),
			(101501, 'OP Billing', 1, 1, 101500, '/medora/home/administration/billing-setup/op-billing', 1),
			(101502, 'IP Billing', 1, 1, 101500, '/medora/home/administration/billing-setup/ip-billing', 2),
			(101503, 'ED Billing', 1, 1, 101500, '/medora/home/administration/billing-setup/ed-billing', 3),
			(101504, 'Billing Settings', 1, 1, 101500, '/medora/home/administration/billing-setup/settings', 4),
			(101600, 'ED triage levels', 1, 1, null, '/medora/home/administration/er-triage-level', 19),
			(101610, 'Trauma activation setup', 1, 1, null, '/medora/home/administration/trauma-activation-setup', 20),

			-- ── Module 2: Registration ──
			(200100, 'Patient', 2, 1, null, '/medora/home/registration/patient', 1),
			(200101, 'Patient Registration', 2, 1, 200100, '/medora/home/registration/patient/registration', 1),
			(200102, 'Patient List', 2, 1, 200100, '/medora/home/registration/patient/list', 2),

			-- ── Module 3: Appointment ──
			(300100, 'Doctor Appointment', 3, 1, null, '/medora/home/appointment/doctor-appointment', 1),

			-- ── Module 4: Nursing Workbench (chart tab order; hospital boards live in ADT / Emergency) ──
			(400100, 'Nursing Workbench', 4, 1, null, '/medora/home/nursing-workbench', 1),
			(400108, 'Dashboard', 4, 1, 400100, '/medora/home/nursing-workbench/patient-visit-history-dashboard', 1),
			(400116, 'Journal', 4, 1, 400108, '/medora/home/nursing-workbench/patient-visit-history-dashboard/journal', 1),
			(400117, 'Visual', 4, 1, 400108, '/medora/home/nursing-workbench/patient-visit-history-dashboard/visual', 2),
			(400101, 'Vital', 4, 1, 400100, '/medora/home/nursing-workbench/vital', 2),
			(400102, 'Allergy', 4, 1, 400100, '/medora/home/nursing-workbench/allergy', 3),
			(400106, 'Order', 4, 1, 400100, '/medora/home/nursing-workbench/order', 4),
			(400107, 'Nursing Complete', 4, 1, 400100, '/medora/home/nursing-workbench/nursing-complete', 5),
			(400105, 'Case Sheet', 4, 1, 400100, '/medora/home/nursing-workbench/case-sheet', 6),
			(400104, 'Clinical Document', 4, 1, 400100, '/medora/home/nursing-workbench/clinical-document', 7),
			(400103, 'Patient Attachment', 4, 1, 400100, '/medora/home/nursing-workbench/patient-attachment', 8),
			(400113, 'eMAR', 4, 1, 400100, '/medora/home/nursing-workbench/emar', 9),
			(400114, 'Care plans', 4, 1, 400100, '/medora/home/nursing-workbench/care-plan', 10),
			(400111, 'Triage', 4, 1, 400100, '/medora/home/nursing-workbench/triage', 11),
			(400115, 'MLC documentation', 4, 1, 400100, '/medora/home/nursing-workbench/mlc-documentation', 12),

			-- ── Module 6: Consultation ──
			(600100, 'EMR', 6, 1, null, '/medora/home/consultation/emr', 1),
			(600200, 'CPOE', 6, 1, null, '/medora/home/consultation/cpoe', 2),
			(600201, 'Order', 6, 1, 600200, '/medora/home/consultation/cpoe/order', 1),
			(600202, 'Prescription', 6, 1, 600200, '/medora/home/consultation/cpoe/prescription', 2),
			(600203, 'Refer', 6, 1, 600200, '/medora/home/consultation/cpoe/refer', 3),
			(600204, 'Refer Doctor', 6, 1, 600203, '/medora/home/consultation/cpoe/refer/doctor', 1),
			(600205, 'Referral History', 6, 1, 600203, '/medora/home/consultation/cpoe/refer/history', 2),
			(600300, 'Results', 6, 1, null, '/medora/home/consultation/results', 3),
			(600400, 'Discharge Summary', 6, 1, null, '/medora/home/consultation/discharge-summary', 4),
			(600500, 'Procedures', 6, 1, null, '/medora/home/consultation/procedures', 5),
			(600600, 'Operative Notes', 6, 1, null, '/medora/home/consultation/operative-notes', 6),

			-- ── Module 7: ADT ──
			(700100, 'Bed Status', 7, 1, null, '/medora/home/adt/bed-status', 1),
			(700200, 'Admission', 7, 1, null, '/medora/home/adt/admission', 2),
			(700201, 'New Admission', 7, 1, 700200, '/medora/home/adt/admission/new', 1),
			(700202, 'Admission List', 7, 1, 700200, '/medora/home/adt/admission/list', 2),
			(700203, 'Pending Admissions', 7, 1, 700200, '/medora/home/adt/admission/pending', 3),
			(700300, 'Booking', 7, 1, null, '/medora/home/adt/booking', 3),
			(700301, 'New Booking', 7, 1, 700300, '/medora/home/adt/booking/new', 1),
			(700302, 'Booking List', 7, 1, 700300, '/medora/home/adt/booking/list', 2),
			(700400, 'Bed Transfer Requisition', 7, 1, null, '/medora/home/adt/bed-transfer-requisition', 4),
			(700401, 'New Requisition', 7, 1, 700400, '/medora/home/adt/bed-transfer-requisition/new', 1),
			(700402, 'Requisition List', 7, 1, 700400, '/medora/home/adt/bed-transfer-requisition/list', 2),
			-- Census keeps its 4xxxxx id (user_group_page grants reference it) though it now sits in ADT.
			(400109, 'Census', 7, 1, null, '/medora/home/nursing-workbench/census', 5),

			-- ── Module 8: Billing ──
			(800100, 'Bill', 8, 1, null, '/medora/home/billing/bill', 1),
			(800200, 'Advance Deposit', 8, 1, null, '/medora/home/billing/advance-deposit', 2),

			-- ── Module 9: Inventory Setup ──
			(900100, 'Stores', 9, 1, null, '/medora/home/inventory-setup/stores', 1),
			(900200, 'Item Master', 9, 1, null, '/medora/home/inventory-setup/item-master', 2),
			(900300, 'Pharmacy Generic', 9, 1, null, '/medora/home/inventory-setup/pharmacy-generic', 3),
			(900400, 'Unit Master', 9, 1, null, '/medora/home/inventory-setup/unit-master', 4),
			(900500, 'Item Unit Master', 9, 1, null, '/medora/home/inventory-setup/item-unit-master', 5),
			(900600, 'Supplier Setup', 9, 1, null, '/medora/home/inventory-setup/supplier-setup', 7),
			(900700, 'Approval Config', 9, 1, null, '/medora/home/inventory-setup/approval-config', 8),
			(900800, 'Pricing configuration', 9, 1, null, '/medora/home/inventory-setup/pricing-configuration', 9),
			(900801, 'Assignments', 9, 1, 900800, '/medora/home/inventory-setup/pricing-configuration/config', 1),
			(900802, 'Formula templates', 9, 1, 900800, '/medora/home/inventory-setup/pricing-configuration/formula-templates', 2),
			(900900, 'Reorder level', 9, 1, null, '/medora/home/inventory-setup/reorder-level', 11),
			(901000, 'Stock alerts', 9, 1, null, '/medora/home/inventory-setup/stock-alerts', 12),
			(901001, 'Policy', 9, 1, 901000, '/medora/home/inventory-setup/stock-alerts/policy', 1),
			(901002, 'Recipients', 9, 1, 901000, '/medora/home/inventory-setup/stock-alerts/recipients', 2),

			-- ── Module 10: Inventory ──
			(1000100, 'Purchase Requisition', 10, 1, null, '/medora/home/inventory/purchase-requisition', 1),
			(1000200, 'Purchase Order', 10, 1, null, '/medora/home/inventory/purchase-order', 2),
			(1000300, 'Goods Receipt', 10, 1, null, '/medora/home/inventory/grn', 3),
			(1000400, 'Stock', 10, 1, null, '/medora/home/inventory/stock', 4),
			(1000500, 'Department indent', 10, 1, null, '/medora/home/inventory/department-indent', 5),
			(1000600, 'Department issue', 10, 1, null, '/medora/home/inventory/department-issue', 6),
			(1000700, 'Receipt from store', 10, 1, null, '/medora/home/inventory/receipt-from-store', 7),
			(1000800, 'Department consumption', 10, 1, null, '/medora/home/inventory/department-consumption', 8),
			(1000900, 'Reports', 10, 1, null, '/medora/home/inventory/reports', 9),
			(1000901, 'Low stock report', 10, 1, 1000900, '/medora/home/inventory/reports/low-stock', 1),
			(1000902, 'Expired/expiring report', 10, 1, 1000900, '/medora/home/inventory/reports/expired', 2),
			(1000903, 'Movement log', 10, 1, 1000900, '/medora/home/inventory/reports/movement', 3),

			-- ── Module 11: Medication Order ──
			(1100100, 'Internal Sales', 11, 1, null, '/medora/home/medication-order/internal-sales', 1),
			(1100200, 'External Sales', 11, 1, null, '/medora/home/medication-order/external-sales', 2),

			-- ── Module 12: Emergency ──
			-- Registration (1200100–1200102) and ED Bed Status (1200200) are retired:
			-- ADT admission and the ADT bed-status board cover ED. Rows stay inactive
			-- because user_group_page grants reference their ids.
			(1200100, 'Registration', 12, 2, null, '/medora/home/emergency/admission', 1),
			(1200101, 'ED Patient Registration', 12, 2, 1200100, '/medora/home/emergency/admission/new', 1),
			(1200102, 'New patient', 12, 2, 1200100, '/medora/home/emergency/admission/new-patient', 2),
			(1200200, 'ED Bed Status', 12, 2, null, '/medora/home/emergency/bed-status', 2),
			-- Boards keep their 4xxxxx ids (user_group_page grants reference them) though they now sit in Emergency.
			(400110, 'Track Board', 12, 1, null, '/medora/home/nursing-workbench/track-board', 3),
			(400112, 'Trauma Log', 12, 1, null, '/medora/home/nursing-workbench/trauma-log', 4),

			-- ── Module 13: Perioperative ──
			(1300100, 'OT Board', 13, 1, null, '/medora/home/perioperative/ot-board', 1),
			(1300200, 'Cases', 13, 1, null, '/medora/home/perioperative/cases', 2),
			(1300300, 'Pre-op Worklist', 13, 1, null, '/medora/home/perioperative/pre-op', 3),
			(1300400, 'Room Setup', 13, 1, null, '/medora/home/perioperative/room-setup', 4),
			(1300500, 'Procedure Log', 13, 1, null, '/medora/home/perioperative/procedure-log', 5),

			-- ── Module 14: Obstetrics ──
			(1400100, 'Labor Board', 14, 1, null, '/medora/home/obstetrics/labor-board', 1),
			(1400200, 'Partogram', 14, 1, null, '/medora/home/obstetrics/partogram', 2),

			-- ── Module 15: Diagnostics ──
			(1500100, 'Lab Dashboard', 15, 1, null, '/medora/home/diagnostics/lab/dashboard', 1),
			(1500200, 'Collection Worklist', 15, 1, null, '/medora/home/diagnostics/lab/collection-worklist', 2),
			(1500300, 'Lab Receive', 15, 1, null, '/medora/home/diagnostics/lab/receive', 3),
			(1500400, 'Hematology Worklist', 15, 1, null, '/medora/home/diagnostics/lab/worklist/hematology', 4),
			(1500500, 'Chemistry Worklist', 15, 1, null, '/medora/home/diagnostics/lab/worklist/chemistry', 5),
			(1500600, 'Microbiology Worklist', 15, 1, null, '/medora/home/diagnostics/lab/worklist/microbiology', 6),
			(1500700, 'Lab Results', 15, 1, null, '/medora/home/diagnostics/lab/results', 7),
			(1500800, 'Critical Callbacks', 15, 1, null, '/medora/home/diagnostics/lab/critical-callback', 8),
			(1500900, 'Lab Catalog', 15, 1, null, '/medora/home/diagnostics/lab/catalog', 9),
			(1501000, 'Integration Health', 15, 1, null, '/medora/home/diagnostics/lab/integration', 10)

		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			module_id = EXCLUDED.module_id,
			status_id = EXCLUDED.status_id,
			parent_id = EXCLUDED.parent_id,
			page_url = EXCLUDED.page_url,
			sequence_no = EXCLUDED.sequence_no,
			updated_at = now();
		`);
	seedLogger.info('Seeded: page');

	// The nav tree is cached (L1 + optional Redis) for 120 s; drop it so new / moved pages show up.
	// (Not via page-nav-cache.server: it pulls in $env, which the tsx seed runner cannot resolve.)
	await invalidateCacheKey(cacheKeys.medoraNavPages());
	await invalidateCacheTag(cacheTags.medoraNav);

	const whoSystems = resolveWhoIcdSeedSystems();
	if (whoSystems == null) {
		seedLogger.warn(
			'Skipped diagnosis_code WHO import (WHO_ICD_SKIP_SEED or WHO_ICD_SEED_SYSTEM=NONE).'
		);
	} else {
		try {
			const icdResult = await importWhoIcdSystems({
				systems: whoSystems,
				notesPrefix: 'Seeded by information-table-seed (WHO ICD-API)',
				log: (m) => seedLogger.info(m)
			});
			seedLogger.info(
				`Seeded: diagnosis_code (WHO ICD-API) inserted=${icdResult.inserted} updated=${icdResult.updated} total=${icdResult.total}`
			);
		} catch (err) {
			if (err instanceof WhoIcdCredentialsError) {
				throw new Error(
					`${err.message} Or set WHO_ICD_SKIP_SEED=1 to skip ICD during information seed (not recommended for real hospitals).`,
					{ cause: err }
				);
			}
			throw err;
		}
	}

	const icdCmSkip =
		(process.env.ICD10_CM_SKIP_SEED ?? '').trim().toLowerCase() === '1';
	const icdCmSeed =
		(process.env.ICD10_CM_SEED ?? '').trim().toLowerCase() === '1';
	if (icdCmSkip) {
		seedLogger.warn('Skipped ICD-10-CM import (ICD10_CM_SKIP_SEED=1).');
	} else if (icdCmSeed) {
		try {
			const cmResult = await importIcd10CmCatalogue({
				notesPrefix: 'Seeded by information-table-seed (CDC ICD-10-CM)',
				log: (m) => seedLogger.info(m)
			});
			seedLogger.info(
				`Seeded: diagnosis_code (ICD-10-CM) inserted=${cmResult.inserted} updated=${cmResult.updated} total=${cmResult.total}`
			);
		} catch (err) {
			throw err;
		}
	}

	if (isSnomedSeedSkipped()) {
		seedLogger.warn('Skipped SNOMED CT import (SNOMED_SKIP_SEED is set).');
	} else if ((process.env.SNOMED_RF2_DIR ?? '').trim()) {
		try {
			const snomedResult = await importSnomedRf2Catalogue({
				notesPrefix: 'Seeded by information-table-seed (SNOMED RF2)',
				log: (m) => seedLogger.info(m)
			});
			seedLogger.info(
				`Seeded: diagnosis_code (SNOMED CT) inserted=${snomedResult.inserted} updated=${snomedResult.updated} total=${snomedResult.total}`
			);
		} catch (err) {
			if (err instanceof SnomedRf2ImportError) {
				throw new Error(
					`${err.message} Or set SNOMED_SKIP_SEED=1 to skip SNOMED during information seed.`,
					{ cause: err }
				);
			}
			throw err;
		}
	}

	// 5. Status Tagging Type
	await db.execute(sql`
		INSERT INTO status_tagging_type (id, name)
		VALUES
			(1, 'Doctor Appointment'),
			(2, 'Visit'),
			(3, 'Purchase Requisition'),
			(4, 'Purchase Order'),
			(5, 'Goods Receipt'),
			(6, 'Store Transfer'),
			(7, 'Stock Issue'),
			(8, 'Department indent'),
			(9, 'Department issue'),
			(10, 'Department consumption'),
			(11, 'Billing'),
			(12, 'IPD Bed Booking'),
			(13, 'IPD Bed Transfer Requisition'),
			(14, 'IPD Admission Order'),
			(15, 'Surgical Case'),
			(16, 'Clinical Form Instance')
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name;
		`);
	seedLogger.info('Seeded: status tagging type');

	// 6. status_tagging
	await db.execute(sql`
		INSERT INTO status_tagging (id, name, code, sequence_no, status_tagging_type_id)
		VALUES 

			-- Doctor Appointment Status
			(1, 'Unconfirmed', 'unconfirmed', 1, 1),
			(2, 'Confirmed', 'confirmed', 2, 1),
			(3, 'Check In', 'check_in', 3, 1),
			(4, 'Cancelled', 'cancel', 4, 1),

			-- Visit Status (order is important): Open → Vital → Seen → Closed / Discharged
			(5, 'Open', 'open', 1, 2),
			(6, 'Vital', 'vital', 2, 2),
			(7, 'Seen', 'seen', 3, 2),
			(8, 'Closed / Discharged', 'closed_discharged', 4, 2),

			-- Purchase Requisition (ids 9–13; StatusTaggingTypeEnum.INV_PURCHASE_REQUISITION)
			(9, 'Draft', 'draft', 1, 3),
			(10, 'Pending', 'pending', 2, 3),
			(11, 'Approved', 'approved', 3, 3),
			(12, 'Rejected', 'rejected', 4, 3),
			(13, 'Sent Back', 'sent_back', 5, 3),
			(31, 'Cancelled', 'cancelled', 6, 3),

			-- Purchase Order (14–21)
			(14, 'Draft', 'draft', 1, 4),
			(15, 'Pending', 'pending', 2, 4),
			(16, 'Approved', 'approved', 3, 4),
			(17, 'Rejected', 'rejected', 4, 4),
			(18, 'Sent Back', 'sent_back', 5, 4),
			(19, 'Sent To Supplier', 'sent_to_supplier', 6, 4),
			(20, 'Partially Received', 'partially_received', 7, 4),
			(21, 'Closed', 'closed', 8, 4),

			-- Goods Receipt (22–24)
			(22, 'Draft', 'draft', 1, 5),
			(23, 'Posted', 'posted', 2, 5),
			(24, 'Cancelled', 'cancelled', 3, 5),

			-- Store Transfer (25–27)
			(25, 'Draft', 'draft', 1, 6),
			(26, 'Posted', 'posted', 2, 6),
			(27, 'Cancelled', 'cancelled', 3, 6),

			-- Stock Issue (28–30)
			(28, 'Draft', 'draft', 1, 7),
			(29, 'Posted', 'posted', 2, 7),
			(30, 'Cancelled', 'cancelled', 3, 7),

			-- Department indent (40–45; type 8 — mirrors drizzle/0039_*_dept_indent.sql; InvDepartmentIndentStatusTaggingEnum)
			(40, 'Draft', 'draft', 1, 8),
			(41, 'Pending', 'pending', 2, 8),
			(42, 'Pending central', 'pending_central', 3, 8),
			(43, 'Issued', 'issued', 4, 8),
			(44, 'Received', 'received', 5, 8),
			(45, 'Cancelled', 'cancelled', 6, 8),

			-- Department issue (46–49; type 9 — drizzle/0048_department_issue_tables_and_status.sql; InvDepartmentIssueStatusTaggingEnum)
			(46, 'Pending', 'pending', 1, 9),
			(47, 'Issued', 'issued', 2, 9),
			(48, 'Received', 'received', 3, 9),
			(49, 'Cancelled', 'cancelled', 4, 9),

			-- Department consumption (50–53; type 10 — drizzle/0050_inv_department_consumption.sql)
			(50, 'Draft', 'draft', 1, 10),
			(51, 'Pending', 'pending', 2, 10),
			(52, 'Posted', 'posted', 3, 10),
			(53, 'Cancelled', 'cancelled', 4, 10),

			-- Billing (56–57; type 11 — BillingStatusTaggingEnum; shared by OP + IP)
			(56, 'Open', 'open', 1, 11),
			(57, 'Closed', 'closed', 2, 11),

			-- IPD Bed Booking (60–62; type 12 — IpdBedBookingStatusTaggingEnum)
			(60, 'Booked', 'booked', 1, 12),
			(61, 'Cancelled', 'cancelled', 2, 12),
			(62, 'Converted', 'converted', 3, 12),

			-- IPD Bed Transfer Requisition (63–67; type 13 — IpdBedTransferReqStatusTaggingEnum)
			(63, 'Draft', 'draft', 1, 13),
			(64, 'Pending', 'pending', 2, 13),
			(65, 'Approved', 'approved', 3, 13),
			(66, 'Completed', 'completed', 4, 13),
			(67, 'Cancelled', 'cancelled', 5, 13),

			-- IPD Admission Order (68–70; type 14 — IpdAdmissionOrderStatusTaggingEnum)
			(68, 'Pending', 'pending', 1, 14),
			(69, 'Cancelled', 'cancelled', 2, 14),
			(70, 'Admitted', 'admitted', 3, 14),

			-- Surgical Case (71-78; type 15)
			(71, 'Requested', 'requested', 1, 15),
			(72, 'Scheduled', 'scheduled', 2, 15),
			(73, 'Pre-op complete', 'pre_op_complete', 3, 15),
			(74, 'In OR', 'in_or', 4, 15),
			(75, 'In PACU', 'in_pacu', 5, 15),
			(76, 'Completed', 'completed', 6, 15),
			(77, 'Cancelled', 'cancelled', 7, 15),
			(78, 'Pending reschedule', 'pending_reschedule', 8, 15),

			-- Clinical Form Instance (79-81; type 16)
			(79, 'Draft', 'draft', 1, 16),
			(80, 'Complete', 'complete', 2, 16),
			(81, 'Amended', 'amended', 3, 16)

		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			code = EXCLUDED.code,
			sequence_no = EXCLUDED.sequence_no,
			status_tagging_type_id = EXCLUDED.status_tagging_type_id;
		`);
	seedLogger.info('Seeded: status tagging');

	// 8. Document Master — document_type is master data (master-table-seed.ts).

	// Global `document` rows from code catalog, then hospital_document links (below)
	try {
		const { provisionDocumentMasterForSeed } = await import(
			'./document-master-provision.seed'
		);
		await provisionDocumentMasterForSeed(db);
	} catch (e) {
		seedLogger.info(
			`Skipped: hospital document provision (${e instanceof Error ? e.message : String(e)})`
		);
	}

	// 9. Allergy
	await db.execute(sql`
		INSERT INTO allergy (id, name)
		VALUES
			(1, 'No Known Allergy')
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: allergy');

	// No app cache invalidation here — seeds run under tsx, not SvelteKit ($env).

	try {
		const { seedEdTriageLevelsForHospitals } = await import(
			'$lib/server/db/seed/init/seed-ed-triage-levels.server'
		);
		await seedEdTriageLevelsForHospitals(db);
		const { seedTraumaActivationDefaultsForHospitals } = await import(
			'$lib/server/db/seed/init/seed-trauma-activation-defaults.server'
		);
		await seedTraumaActivationDefaultsForHospitals(db);
	} catch (e) {
		seedLogger.warn(
			`Skipped: ed_triage_level (${e instanceof Error ? e.message : String(e)})`
		);
	}
}

seedInformationTables()
	.then(() => {
		seedLogger.info('Information table seeding finished');
		process.exit(0);
	})
	.catch((error) => {
		seedLogger.error(
			'Error while seeding information tables',
			error instanceof Error ? error : new Error(String(error))
		);
		process.exit(1);
	});
