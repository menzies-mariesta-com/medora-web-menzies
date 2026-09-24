import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { seedLogger } from '$lib/logger';
import {
	CLINICAL_FORM_SEED_ROWS,
	buildClinicalFormDocumentText
} from '$lib/util/clinical-form-print-body.util';
import {
	seedEmrDemoForAllHospitals,
	seedEmrDemoSubCategories
} from './emr-order-demo-seed';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/** Fixed UUID for seed staff so we can reference it in staff_hospital, staff_department, etc. */
// const SEED_STAFF_ID = '01900000-0000-7000-8000-000000000001';

/**
 * Seed information/business tables with sample data.
 *
 * Run after master-table-seed. Inserts in FK-safe order.
 *
 * Per-hospital **`item_master`** catalog rows are **not** seeded here (created via the app).
 * Migration **`0074_item_master_drop_barcode_batch_required`** removes legacy **`barcode`** /
 * **`is_batch_required`** columns; no seed SQL references those columns.
 *
 * Also applies inventory approval DDL (module CHECK + active unique on
 * `inv_approval_level`) so environments that use `pnpm db:seed` without a full
 * `db:migrate` run still match drizzle 0039–0041 for approval config.
 *
 * Also rewrites legacy `/heka/` module/page URLs to `/medora/` on every seed run
 * (seed uses ON CONFLICT DO NOTHING for those rows, so inserts alone would not update).
 *
 * npx tsx src/lib/server/db/seed/information-table-seed.ts
 */
export async function seedInformationTables() {
	seedLogger.info('Seeding information tables...');

	// Rebrand path rewrite for seed/db:push workflows (no drizzle migrate required).
	// Existing rows keep /heka/... until this runs; new INSERTs below already use /medora/...
	await db.execute(sql`
		UPDATE module
		SET module_url = REPLACE(module_url, '/heka/', '/medora/')
		WHERE module_url LIKE '/heka/%';
	`);
	await db.execute(sql`
		UPDATE page
		SET page_url = REPLACE(page_url, '/heka/', '/medora/')
		WHERE page_url LIKE '/heka/%';
	`);
	seedLogger.info('Rewrote module/page URLs: /heka/ → /medora/');

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
			(8, 'Billing', 8, 1, '/medora/home/billing', 'receipt-text'),
			(9, 'Inventory Setup', 9, 1, '/medora/home/inventory-setup', 'warehouse'),
			(10, 'Inventory', 10, 1, '/medora/home/inventory', 'package'),
			(11, 'Medication Order', 11, 1, '/medora/home/medication-order', 'pill')
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
	await db.execute(sql`
		INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
		VALUES
			-- Parent Page Id (1 -> 100000)
			-- Child Page Id (1 -> 100001)
			-- Child Page Id (1 -> 100002)
			-- Parent Page Id (2 -> 200000)
			-- Child Page Id (2 -> 200001)

			-- Administration Module
			-- staff pages
			(1, 'Staff', 1, 1, null, '/medora/home/administration/staff', 1),
			(100001, 'Staff Registration', 1, 1, 1, '/medora/home/administration/staff/registration', 1),
			(100002, 'Staff List', 1, 1, 1, '/medora/home/administration/staff/list', 2),

			-- schedule
			(3, 'Schedule Master', 1, 1, null, '/medora/home/administration/schedule-master', 1),
			(300001, 'Doctor Schedule', 1, 1, 3, '/medora/home/administration/schedule-master/doctor-schedule', 1),

			-- external refer master
			(5, 'External Refer Master', 1, 1, null, '/medora/home/administration/external-refer-master', 1),

			-- user group (per-hospital management)
			(6, 'User Group', 1, 1, null, '/medora/home/administration/user-group', 4),

			-- branches (per-hospital; Branch is under Hospital)
			(7, 'Branches', 1, 1, null, '/medora/home/administration/branches', 5),

			-- category
			(9, 'Service Order', 1, 1, null, '/medora/home/administration/service-order', 6),
			(900001, 'Category Master', 1, 1, 9, '/medora/home/administration/service-order/category-master', 1),
			(900002, 'Service Item Master', 1, 1, 9, '/medora/home/administration/service-order/service-item-master', 3),
			(900004, 'Sub Category Master', 1, 1, 9, '/medora/home/administration/service-order/sub-category-master', 2),
			(900005, 'Service Item Tagging', 1, 1, 9, '/medora/home/administration/service-order/service-item-tagging', 4),

			-- document master
			(10, 'Document Master', 1, 1, null, '/medora/home/administration/document-master', 7),
			(100007, 'Document Type', 1, 1, 10, '/medora/home/administration/document-master/document-type', 1),
			(100008, 'Document', 1, 1, 10, '/medora/home/administration/document-master/document', 2),
			(100009, 'Document Setting', 1, 1, 10, '/medora/home/administration/document-master/document-setting', 3),

			-- Registration Module
			-- patient pages
			(2, 'Patient', 2, 1, null, '/medora/home/registration/patient', 1),
			(200001, 'Patient Registration', 2, 1, 2, '/medora/home/registration/patient/registration', 1),
			(200002, 'Patient List', 2, 1, 2, '/medora/home/registration/patient/list', 2),

			-- Appointment Module
			-- doctor appointments
			(4, 'Doctor Appointment', 3, 1, null, '/medora/home/appointment/doctor-appointment', 1),

			-- Nursing Workbench Module
			(8, 'Nursing OPD', 4, 1, null, '/medora/home/nursing-workbench/emr', 1),
			(800001, 'Vital', 4, 1, 8, '/medora/home/nursing-workbench/emr/vital', 1),
			(800002, 'Allergy', 4, 1, 8, '/medora/home/nursing-workbench/emr/allergy', 2),
			(800003, 'Nursing Complete', 4, 1, 8, '/medora/home/nursing-workbench/emr/nursing-complete', 7),
			(800004, 'Case Sheet', 4, 1, 8, '/medora/home/nursing-workbench/emr/case-sheet', 5),
			(800005, 'Clinical Document', 4, 1, 8, '/medora/home/nursing-workbench/emr/clinical-document', 4),
			(800006, 'Patient Attachment', 4, 1, 8, '/medora/home/nursing-workbench/emr/patient-attachment', 3),
			(800007, 'Order', 4, 1, 8, '/medora/home/nursing-workbench/emr/order', 6),
			(800008, 'Patient Visit History Dashboard', 4, 1, 8, '/medora/home/nursing-workbench/emr/patient-visit-history-dashboard', 7),

			-- Nursing IPD (ids 44 / 1900001+ — avoid inventory-setup 19–21 collision)
			(44, 'Nursing IPD', 4, 1, null, '/medora/home/nursing-workbench/ipd', 2),
			(1900001, 'IPD Census', 4, 1, 44, '/medora/home/nursing-workbench/ipd/census', 1),
			(1900002, 'Vital', 4, 1, 44, '/medora/home/nursing-workbench/ipd/vital', 2),
			(1900003, 'Allergy', 4, 1, 44, '/medora/home/nursing-workbench/ipd/allergy', 3),
			(1900004, 'Patient Attachment', 4, 1, 44, '/medora/home/nursing-workbench/ipd/patient-attachment', 4),
			(1900005, 'Clinical Document', 4, 1, 44, '/medora/home/nursing-workbench/ipd/clinical-document', 5),
			(1900006, 'Case Sheet', 4, 1, 44, '/medora/home/nursing-workbench/ipd/case-sheet', 6),
			(1900007, 'Order', 4, 1, 44, '/medora/home/nursing-workbench/ipd/order', 7),
			(1900008, 'Nursing Complete', 4, 1, 44, '/medora/home/nursing-workbench/ipd/nursing-complete', 8),

			-- Consultation Module
			(13, 'EMR', 6, 1, null, '/medora/home/consultation/emr', 1),
			(1500001, 'CPOE', 6, 1, null, '/medora/home/consultation/cpoe', 2),
			(11, 'Order', 6, 1, 1500001, '/medora/home/consultation/cpoe/order', 1),
			(12, 'Prescription', 6, 1, 1500001, '/medora/home/consultation/cpoe/prescription', 2),
			(14, 'Refer', 6, 1, 1500001, '/medora/home/consultation/cpoe/refer', 3),
			(1400001, 'Refer Doctor', 6, 1, 14, '/medora/home/consultation/cpoe/refer/doctor', 1),
			(1400002, 'Referral History', 6, 1, 14, '/medora/home/consultation/cpoe/refer/history', 2),
			(48, 'Results', 6, 1, null, '/medora/home/consultation/results', 3),
			(49, 'Discharge Summary', 6, 1, null, '/medora/home/consultation/discharge-summary', 4),
			(50, 'Procedures', 6, 1, null, '/medora/home/consultation/procedures', 5),
			(51, 'Operative Notes', 6, 1, null, '/medora/home/consultation/operative-notes', 6),

			-- Billing Module
			(15, 'OP Billing', 8, 1, null, '/medora/home/billing/op-billing', 1),
			(150001, 'IP Billing', 8, 1, null, '/medora/home/billing/ip-billing', 2),

			-- Administration: Financial Year & Prefix Configuration
			(16, 'Prefix Configuration', 1, 1, null, '/medora/home/administration/prefix-configuration', 9),
			(17, 'Financial Year', 1, 1, null, '/medora/home/administration/financial-year', 8),

			-- master department catalog; store per branch linked to user group XOR department
			(18, 'Departments', 1, 1, null, '/medora/home/administration/departments', 10),

			-- IPD masters
			(45, 'Ward Master', 1, 1, null, '/medora/home/administration/ward-master', 13),
			(450001, 'Ward Category', 1, 1, 45, '/medora/home/administration/ward-master/ward-category', 1),
			(450002, 'Ward', 1, 1, 45, '/medora/home/administration/ward-master/ward', 2),
			(47, 'Room Master', 1, 1, null, '/medora/home/administration/room-master', 14),
			(470001, 'Room Category', 1, 1, 47, '/medora/home/administration/room-master/room-category', 1),
			(470002, 'Room', 1, 1, 47, '/medora/home/administration/room-master/room', 2),
			(46, 'Bed Master', 1, 1, null, '/medora/home/administration/bed-master', 15),

			(35, 'Medication Order Setup', 1, 1, null, '/medora/home/administration/medication-order-setup', 12),
			(350001, 'Frequency', 1, 1, 35, '/medora/home/administration/medication-order-setup/frequency', 1),
			(350002, 'Form', 1, 1, 35, '/medora/home/administration/medication-order-setup/form', 2),
			(350003, 'Route', 1, 1, 35, '/medora/home/administration/medication-order-setup/route', 3),
			(350004, 'Duration unit', 1, 1, 35, '/medora/home/administration/medication-order-setup/duration', 4),
			(350005, 'Order type', 1, 1, 35, '/medora/home/administration/medication-order-setup/order-type', 5),
			(350006, 'Dose unit', 1, 1, 35, '/medora/home/administration/medication-order-setup/dose-unit', 6),
			(350007, 'Food relation', 1, 1, 35, '/medora/home/administration/medication-order-setup/food-relation', 7),

			-- Inventory Setup Module (main pages; no parent Inventory Setup page)
			(19, 'Stores', 9, 1, null, '/medora/home/inventory-setup/stores', 1),
			(20, 'Item Master', 9, 1, null, '/medora/home/inventory-setup/item-master', 2),
			(21, 'Pharmacy Generic', 9, 1, null, '/medora/home/inventory-setup/pharmacy-generic', 3),
			(22, 'Unit Master', 9, 1, null, '/medora/home/inventory-setup/unit-master', 4),
			(23, 'Item Unit Master', 9, 1, null, '/medora/home/inventory-setup/item-unit-master', 5),
			(25, 'Supplier Setup', 9, 1, null, '/medora/home/inventory-setup/supplier-setup', 7),
			(26, 'Approval Config', 9, 1, null, '/medora/home/inventory-setup/approval-config', 8),
			(43, 'Pricing configuration', 9, 1, null, '/medora/home/inventory-setup/pricing-config', 9),
			(430001, 'Pricing formula templates', 9, 1, null, '/medora/home/inventory-setup/pricing-formula-templates', 10),
			(32, 'Reorder level', 9, 1, null, '/medora/home/inventory-setup/reorder-level', 11),
			(42, 'Stock alerts', 9, 1, null, '/medora/home/inventory-setup/stock-alerts', 12),
			(420001, 'Policy', 9, 1, 42, '/medora/home/inventory-setup/stock-alerts/policy', 1),
			(420002, 'Recipients', 9, 1, 42, '/medora/home/inventory-setup/stock-alerts/recipients', 2),

			-- Inventory Module (main pages; no parent Inventory page)
			(27, 'Purchase Requisition', 10, 1, null, '/medora/home/inventory/purchase-requisition', 1),
			(28, 'Purchase Order', 10, 1, null, '/medora/home/inventory/purchase-order', 2),
			(29, 'Goods Receipt', 10, 1, null, '/medora/home/inventory/grn', 3),
			(30, 'Stock', 10, 1, null, '/medora/home/inventory/stock', 4),

			-- Medication Order Module (ids 33-34 from origin/main)
			(33, 'Internal Sales', 11, 1, null, '/medora/home/medication-order/internal-sales', 1),
			(34, 'External Sales', 11, 1, null, '/medora/home/medication-order/external-sales', 2),

			-- Inventory: department flows (renumbered 37-40 to avoid collision with medication-order ids)
			(37, 'Department indent', 10, 1, null, '/medora/home/inventory/department-indent', 5),
			(38, 'Department issue', 10, 1, null, '/medora/home/inventory/department-issue', 6),
			(39, 'Receipt from store', 10, 1, null, '/medora/home/inventory/receipt-from-store', 7),
			(40, 'Department consumption', 10, 1, null, '/medora/home/inventory/department-consumption', 8),
			(41, 'Reports', 10, 1, null, '/medora/home/inventory/reports', 9),
			(410001, 'Low stock report', 10, 1, 41, '/medora/home/inventory/reports/low-stock', 1),
			(410002, 'Expired/expiring report', 10, 1, 41, '/medora/home/inventory/reports/expired', 2),
			(410003, 'Movement log', 10, 1, 41, '/medora/home/inventory/reports/movement', 3)

		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: page');

	await db.execute(sql`
		INSERT INTO diagnosis_code (code, system, description, status_id)
		VALUES
			('I10', 'ICD10', 'Essential (primary) hypertension', 1),
			('E11.9', 'ICD10', 'Type 2 diabetes mellitus without complications', 1),
			('E78.5', 'ICD10', 'Hyperlipidemia, unspecified', 1),
			('J06.9', 'ICD10', 'Acute upper respiratory infection, unspecified', 1),
			('J18.9', 'ICD10', 'Pneumonia, unspecified organism', 1),
			('J44.9', 'ICD10', 'Chronic obstructive pulmonary disease, unspecified', 1),
			('J45.909', 'ICD10', 'Unspecified asthma, uncomplicated', 1),
			('K21.9', 'ICD10', 'Gastro-esophageal reflux disease without esophagitis', 1),
			('K52.9', 'ICD10', 'Noninfective gastroenteritis and colitis, unspecified', 1),
			('N39.0', 'ICD10', 'Urinary tract infection, site not specified', 1),
			('N18.9', 'ICD10', 'Chronic kidney disease, unspecified', 1),
			('I25.10', 'ICD10', 'Atherosclerotic heart disease without angina', 1),
			('I50.9', 'ICD10', 'Heart failure, unspecified', 1),
			('I48.91', 'ICD10', 'Unspecified atrial fibrillation', 1),
			('I63.9', 'ICD10', 'Cerebral infarction, unspecified', 1),
			('D64.9', 'ICD10', 'Anemia, unspecified', 1),
			('R50.9', 'ICD10', 'Fever, unspecified', 1),
			('R51.9', 'ICD10', 'Headache, unspecified', 1),
			('R07.9', 'ICD10', 'Chest pain, unspecified', 1),
			('R10.9', 'ICD10', 'Unspecified abdominal pain', 1),
			('R11.2', 'ICD10', 'Nausea with vomiting, unspecified', 1),
			('R42', 'ICD10', 'Dizziness and giddiness', 1),
			('M54.5', 'ICD10', 'Low back pain', 1),
			('M19.90', 'ICD10', 'Osteoarthritis, unspecified site', 1),
			('G43.909', 'ICD10', 'Migraine, unspecified, not intractable', 1),
			('F41.9', 'ICD10', 'Anxiety disorder, unspecified', 1),
			('F32.A', 'ICD10', 'Depression, unspecified', 1),
			('L03.90', 'ICD10', 'Cellulitis, unspecified', 1),
			('A09', 'ICD10', 'Infectious gastroenteritis and colitis, unspecified', 1),
			('U07.1', 'ICD10', 'COVID-19', 1)
		ON CONFLICT (system, code) DO UPDATE SET
			description = EXCLUDED.description,
			status_id = EXCLUDED.status_id,
			updated_at = now();
	`);
	seedLogger.info('Seeded: diagnosis_code');

	// 5. Role
	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES
			(1, 'Admin', 1),
			(2, 'Doctor', 1),
			(3, 'Nurse', 1),
			(4, 'Receptionist', 1)
		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: role');

	// 6. Status Tagging Type
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
			(10, 'Department consumption')
		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: status tagging type');

	// 7. status_tagging
	await db.execute(sql`
		INSERT INTO status_tagging (id, name, code, sequence_no, status_tagging_type_id)
		VALUES 

			-- Doctor Appointment Status
			(1, 'Unconfirmed', 'unconfirmed', 1, 1),
			(2, 'Confirmed', 'confirmed', 2, 1),
			(3, 'Check In', 'check_in', 3, 1),
			(4, 'Cancelled', 'cancel', 4, 1),

			-- Visit Status (order is important)
			(5, 'Open', 'open', 1, 2),
			(6, 'Vital', 'vital', 2, 2),
			(7, 'Seen', 'seen', 3, 2),
			(8, 'Closed', 'closed', 6, 2),
			(54, 'Admitted', 'admitted', 4, 2),
			(55, 'Discharged', 'discharged', 5, 2),

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
			(53, 'Cancelled', 'cancelled', 4, 10)

		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: status tagging');

	// 7b. `inv_approval_level` / `inv_approval_log`: module CHECK + partial unique index
	// (mirrors `drizzle/manual_inv_approval_module_check.sql` and 0041; no-op on already-migrated DBs)
	await db.execute(
		sql`ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk"`
	);
	await db.execute(sql`
		ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'))
		`);
	await db.execute(
		sql`ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk"`
	);
	await db.execute(sql`
		ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'))
		`);
	await db.execute(
		sql`DROP INDEX IF EXISTS "inv_approval_level_store_module_level_uidx"`
	);
	await db.execute(
		sql`DROP INDEX IF EXISTS "inv_approval_level_store_module_level_active_uidx"`
	);
	await db.execute(sql`
		CREATE UNIQUE INDEX "inv_approval_level_store_module_level_active_uidx"
		ON "inv_approval_level" ("hospital_id", "store_id", "module", "level")
		WHERE "deleted_at" IS NULL
	`);
	seedLogger.info(
		'Seeded: inv_approval_level schema (module CHECK + active unique index)'
	);

	// 8. Document types (consent, form, instruction, certificate, help)
	// Note: column is 'name' in old schema, 'document_type' in new schema after migration
	await db.execute(sql`
		INSERT INTO document_type (id, document_type, status_id)
		VALUES
			(1, 'Consent', 1),
			(2, 'Form', 1),
			(3, 'Instruction', 1),
			(4, 'Certificate', 1),
			(5, 'Help', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: document_type');

	// 9. Document settings (template configurations)
	await db.execute(sql`
		INSERT INTO document_setting (id, name, document_type_id, margin_top, margin_bottom, margin_left, margin_right, padding_top, padding_bottom, padding_left, padding_right, page_size, page_orientation, show_header, show_footer, header_html, footer_html, status_id)
		VALUES
			(1, 'OPD Consent Form', 1, 20, 20, 15, 15, 10, 10, 10, 10, 'A4', 'portrait', true, true,
				'<div style="text-align:center;"><strong>{{hospital.name}}</strong><br/><span style="font-size:12px;">{{hospital.address}}</span></div>',
				'<div style="text-align:center;font-size:10px;">Page {{page.number}} of {{page.total}} | Printed: {{print.date}} by {{print.by}}</div>',
				1),
			(2, 'ED Case Sheet', 2, 15, 15, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', true, true,
				'<div><strong>{{hospital.name}}</strong> - Emergency Department<br/>Patient: {{patient.name}} | Code: {{patient.code}} | Visit: {{visit.no}}</div>',
				'<div style="font-size:10px;">Doctor: {{doctor.name}} | Date: {{visit.date}}</div>',
				1),
			(3, 'Medical Certificate', 4, 25, 25, 20, 20, 15, 15, 15, 15, 'A4', 'portrait', true, true,
				'<div style="text-align:center;"><strong>MEDICAL CERTIFICATE</strong><br/>{{hospital.name}}</div>',
				'<div style="text-align:right;font-size:11px;"><br/>_____________________<br/>{{doctor.name}}<br/>{{doctor.license}}</div>',
				1),
			(4, 'Discharge Instructions', 3, 15, 15, 15, 15, 10, 10, 10, 10, 'A4', 'portrait', true, true,
				'<div><strong>Discharge Instructions</strong><br/>Patient: {{patient.name}} | DOB: {{patient.dob}} | Age/Gender: {{patient.age}}/{{patient.gender}}</div>',
				'<div style="font-size:10px;">Issued by: {{doctor.name}} on {{visit.date}}</div>',
				1),
			(5, 'A4_plain', 2, 10, 10, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', false, false,
				'',
				'',
				1),
			(6, 'A4_plain (legacy)', 2, 10, 10, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', false, false,
				'',
				'',
				1),
			(7, 'Label_100x60_plain', 2, 4, 4, 4, 4, 2, 2, 2, 2, '100mm 60mm', 'portrait', false, false,
				'',
				'',
				1),
			(8, 'A4_plain (legacy)', 2, 10, 10, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', false, false,
				'',
				'',
				1),
			(9, 'A5_plain', 2, 8, 8, 8, 8, 4, 4, 4, 4, 'A5', 'portrait', false, false,
				'',
				'',
				1)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			document_type_id = EXCLUDED.document_type_id,
			margin_top = EXCLUDED.margin_top,
			margin_bottom = EXCLUDED.margin_bottom,
			margin_left = EXCLUDED.margin_left,
			margin_right = EXCLUDED.margin_right,
			padding_top = EXCLUDED.padding_top,
			padding_bottom = EXCLUDED.padding_bottom,
			padding_left = EXCLUDED.padding_left,
			padding_right = EXCLUDED.padding_right,
			page_size = EXCLUDED.page_size,
			page_orientation = EXCLUDED.page_orientation,
			show_header = EXCLUDED.show_header,
			show_footer = EXCLUDED.show_footer,
			header_html = EXCLUDED.header_html,
			footer_html = EXCLUDED.footer_html,
			status_id = EXCLUDED.status_id;
	`);
	seedLogger.info('Seeded: document_setting');

	// 9b. System print documents (codes used across billing, visits, appointments, pharmacy)
	await db.execute(sql`
		INSERT INTO document (id, document_type_id, code, document_text, document_number, document_setting_id, status_id)
		VALUES
			(
				90001,
				2,
				'NURSING_COMPLETE_PRINT',
				'<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>{{hospital.address}}</header><p>Visit <strong>{{visit.no}}</strong> - {{patient.name}} ({{patient.code}})</p>{{visit.service_lines_table}}',
				'Nursing complete (OP)',
				5,
				1
			),
			(
				90002,
				2,
				'OP_BILL_PRINT',
				'<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>Bill No: {{document.number}} | Date: {{document.date}}<br/>Patient: {{patient.name}} ({{patient.code}})</header><dl class="meta"><div><dt>{{print.label_patient}}</dt><dd>{{patient.name}}</dd></div><div><dt>{{print.label_patient_code}}</dt><dd>{{patient.code}}</dd></div><div><dt>{{print.label_visit_no}}</dt><dd>{{visit.no}}</dd></div><div><dt>{{print.label_date}}</dt><dd>{{visit.date}}</dd></div><div><dt>{{print.label_doctor}}</dt><dd>{{doctor.name}}</dd></div><div><dt>{{print.label_branch}}</dt><dd>{{visit.department}}</dd></div></dl>{{print.body_html}}',
				'OP Bill',
				5,
				1
			),
			(
				90007,
				2,
				'IP_BILL_PRINT',
				'<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>IP Bill No: {{document.number}} | Date: {{document.date}}<br/>Patient: {{patient.name}} ({{patient.code}})</header><dl class="meta"><div><dt>{{print.label_patient}}</dt><dd>{{patient.name}}</dd></div><div><dt>{{print.label_patient_code}}</dt><dd>{{patient.code}}</dd></div><div><dt>{{print.label_visit_no}}</dt><dd>{{visit.no}}</dd></div><div><dt>{{print.label_date}}</dt><dd>{{visit.date}}</dd></div><div><dt>{{print.label_doctor}}</dt><dd>{{doctor.name}}</dd></div><div><dt>{{print.label_branch}}</dt><dd>{{visit.department}}</dd></div></dl>{{print.body_html}}',
				'IP Bill',
				5,
				1
			),
			(
				90003,
				2,
				'VISIT_LABEL_PRINT',
				'<div class="label-header"><img class="label-logo" src="{{hospital.logo}}" alt="" /><h1>{{print.label_heading}}</h1></div><div class="label-rows"><div class="label-row"><div class="pair"><span class="k">{{print.label_patient}}</span><span class="v">{{patient.name}}</span></div><div class="pair right"><span class="k">{{print.label_dob}}</span><span class="v">{{patient.dob}}</span></div></div><div class="label-row"><div class="pair"><span class="k">{{print.label_patient_code}}</span><span class="v">{{patient.code}}</span></div><div class="pair right"><span class="k">{{print.label_doctor}}</span><span class="v">{{doctor.name}}</span></div></div><div class="label-row"><div class="pair"><span class="k">{{print.label_visit_no}}</span><span class="v">{{visit.no}}</span></div><div class="pair right"><span class="k">{{print.label_visit_date}}</span><span class="v">{{visit.date}}</span></div></div></div><div class="barcode-wrap"><svg id="visit-label-barcode"></svg></div>',
				'Visit label',
				7,
				1
			),
			(
				90004,
				2,
				'APPOINTMENT_SLIP_PRINT',
				'<div class="appt-header"><img class="logo" src="{{hospital.logo}}" alt="" /><div><h1 class="title">{{print.label_title}}</h1><p class="sub">{{print.label_subtitle}}</p></div></div><table class="appt-table"><tr><td class="label">{{print.label_patient}}</td><td>{{appointment.patient}}</td></tr><tr><td class="label">{{print.label_doctor}}</td><td>{{appointment.doctor}}</td></tr><tr><td class="label">{{print.label_date}}</td><td>{{appointment.date}}</td></tr><tr><td class="label">{{print.label_start_time}}</td><td>{{appointment.start_time}}</td></tr><tr><td class="label">{{print.label_end_time}}</td><td>{{appointment.end_time}}</td></tr></table>',
				'Appointment slip',
				5,
				1
			),
			(
				90005,
				2,
				'MED_ORDER_RECEIPT_PRINT',
				'<h2>{{print.label_title}}</h2><p><strong>{{document.number}}</strong></p><p class="meta-line">{{print.customer}} · {{print.doctor}}</p>{{print.body_html}}',
				'Medication receipt',
				9,
				1
			),
			(
				90006,
				2,
				'CASE_SHEET_PRINT',
				'<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>{{hospital.address}}</header><h2 class="case-sheet-doc-title">{{print.label_title}}</h2><dl class="meta case-sheet-meta-print"><div><dt>{{print.label_visit_no}}</dt><dd>{{visit.no}}</dd></div><div><dt>{{print.label_patient}}</dt><dd>{{patient.name}}</dd></div><div><dt>{{print.label_patient_code}}</dt><dd>{{patient.code}}</dd></div><div><dt>{{print.label_visit_date}}</dt><dd>{{visit.date}}</dd></div><div><dt>{{print.label_doctor}}</dt><dd>{{doctor.name}}</dd></div></dl>{{print.body_html}}',
				'Nursing case sheet',
				5,
				1
			)
		ON CONFLICT (id) DO UPDATE SET
			document_type_id = EXCLUDED.document_type_id,
			code = EXCLUDED.code,
			document_text = EXCLUDED.document_text,
			document_number = EXCLUDED.document_number,
			document_setting_id = EXCLUDED.document_setting_id,
			status_id = EXCLUDED.status_id;
	`);
	seedLogger.info('Seeded: document (system print templates)');

	// 9b. Blank clinical forms (pen-fill; EMR clinical document page)
	const clinicalFormValues = CLINICAL_FORM_SEED_ROWS.map((row) => {
		const documentText = buildClinicalFormDocumentText(
			row.code
		).replace(/'/g, "''");
		const documentNumber = row.documentNumber.replace(/'/g, "''");
		return `(${row.id}, ${row.documentTypeId}, '${row.code}', '${documentText}', '${documentNumber}', 5, 1)`;
	}).join(',\n\t\t\t');

	await db.execute(
		sql.raw(`
		INSERT INTO document (id, document_type_id, code, document_text, document_number, document_setting_id, status_id)
		VALUES
			${clinicalFormValues}
		ON CONFLICT (id) DO UPDATE SET
			document_type_id = EXCLUDED.document_type_id,
			code = EXCLUDED.code,
			document_text = EXCLUDED.document_text,
			document_number = EXCLUDED.document_number,
			document_setting_id = EXCLUDED.document_setting_id,
			status_id = EXCLUDED.status_id;
	`)
	);
	seedLogger.info('Seeded: document (clinical blank forms)');

	// 8c. Subcategories for EMR/CPOE order “Service Type” filter testing (category_id: 1=RADIOLOGY, 2=NURSING, 5=LAB)
	await db.execute(sql`
		INSERT INTO sub_category (id, category_id, sub_category_name, status_id)
		VALUES
			(90001, 1, '[Dev test] Radiology — General', 1),
			(90002, 2, '[Dev test] Nursing — General', 1),
			(90003, 5, '[Dev test] Laboratory — General', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info(
		'Seeded: sub_category (dev test rows for order service-type filter)'
	);

	await seedEmrDemoSubCategories(db);

	// 9. Allergy
	await db.execute(sql`
		INSERT INTO allergy (id, name)
		VALUES
			(1, 'No Known Allergy')
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: allergy');

	await seedEmrDemoForAllHospitals(db);
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
