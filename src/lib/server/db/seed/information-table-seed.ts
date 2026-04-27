import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { seedLogger } from '$lib/logger';

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
 * npx tsx src/lib/server/db/seed/information-table-seed.ts
 */
export async function seedInformationTables() {
	seedLogger.info('Seeding information tables...');

	// 1. Modules (depends: status)
	await db.execute(sql`
		INSERT INTO module (id, name, sequence_no, status_id, module_url, image_url)
		VALUES 
			(1, 'Administration', 1, 1, '/heka/home/administration', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-star-icon lucide-user-star"><path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/><path d="M8 15H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/></svg>'),
			(2, 'Registration', 2, 1, '/heka/home/registration', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-round-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>'),
			(3, 'Appointment', 3, 1, '/heka/home/appointment', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock-icon lucide-clipboard-clock"><path d="M16 14v2.2l1.6 1"/><path d="M16 4h2a2 2 0 0 1 2 2v.832"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/><circle cx="16" cy="16" r="6"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>'),
			(4, 'Nursing Workbench', 4, 1, '/heka/home/nursing-workbench', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-app-window-icon lucide-app-window"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>'),
			(5, 'Service Item', 5, 1, '/heka/home/service-item', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M2 6h20v12H2z"/><path d="M16 10V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/></svg>'),
			(6, 'CPOE', 6, 1, '/heka/home/cpoe', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M2 6h20v12H2z"/><path d="M16 10V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/></svg>'),
			(7, 'Observation', 7, 1, '/heka/home/observation', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M2 6h20v12H2z"/><path d="M16 10V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/></svg>'),
			(8, 'Billing', 8, 1, '/heka/home/billing', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-receipt-text"><path d="M4 2h16v20l-4-2-4 2-4-2-4 2z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>'),
			(9, 'Inventory Setup', 9, 1, '/heka/home/inventory-setup', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M2 6h20v12H2z"/><path d="M16 10V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/></svg>'),
			(10, 'Inventory', 10, 1, '/heka/home/inventory', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'),
			(11, 'Medication Order', 11, 1, '/heka/home/medication-order', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>')

		ON CONFLICT (id) DO NOTHING;
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
			(1, 'Staff', 1, 1, null, '/heka/home/administration/staff', 1),
			(100001, 'Staff Registration', 1, 1, 1, '/heka/home/administration/staff/registration', 1),
			(100002, 'Staff List', 1, 1, 1, '/heka/home/administration/staff/list', 2),

			-- schedule
			(3, 'Schedule Master', 1, 1, null, '/heka/home/administration/schedule-master', 1),
			(300001, 'Doctor Schedule', 1, 1, 3, '/heka/home/administration/schedule-master/doctor-schedule', 1),

			-- external refer master
			(5, 'External Refer Master', 1, 1, null, '/heka/home/administration/external-refer-master', 1),

			-- user group (per-hospital management)
			(6, 'User Group', 1, 1, null, '/heka/home/administration/user-group', 4),

			-- branches (per-hospital; Branch is under Hospital)
			(7, 'Branches', 1, 1, null, '/heka/home/administration/branches', 5),

			-- category
			(9, 'Service Order', 1, 1, null, '/heka/home/administration/service-order', 6),
			(900001, 'Category Master', 1, 1, 9, '/heka/home/administration/service-order/category-master', 1),
			(900002, 'Service Item Master', 1, 1, 9, '/heka/home/administration/service-order/service-item-master', 3),
			(900004, 'Sub Category Master', 1, 1, 9, '/heka/home/administration/service-order/sub-category-master', 2),
			(900005, 'Service Item Tagging', 1, 1, 9, '/heka/home/administration/service-order/service-item-tagging', 4),

			-- document master
			(10, 'Document Master', 1, 1, null, '/heka/home/administration/document-master', 7),
			(100007, 'Document Type', 1, 1, 10, '/heka/home/administration/document-master/document-type', 1),
			(100008, 'Document', 1, 1, 10, '/heka/home/administration/document-master/document', 2),
			(100009, 'Document Setting', 1, 1, 10, '/heka/home/administration/document-master/document-setting', 3),

			-- Registration Module
			-- patient pages
			(2, 'Patient', 2, 1, null, '/heka/home/registration/patient', 1),
			(200001, 'Patient Registration', 2, 1, 2, '/heka/home/registration/patient/registration', 1),
			(200002, 'Patient List', 2, 1, 2, '/heka/home/registration/patient/list', 2),

			-- Appointment Module
			-- doctor appointments
			(4, 'Doctor Appointment', 3, 1, null, '/heka/home/appointment/doctor-appointment', 1),

			-- Nursing Workbench Module
			(8, 'Nursing OPD', 4, 1, null, '/heka/home/nursing-workbench/emr', 1),
			(800001, 'Vital', 4, 1, 8, '/heka/home/nursing-workbench/emr/vital', 1),
			(800002, 'Allergy', 4, 1, 8, '/heka/home/nursing-workbench/emr/allergy', 2),
			(800003, 'Nursing Complete', 4, 1, 8, '/heka/home/nursing-workbench/emr/nursing-complete', 7),
			(800004, 'Case Sheet', 4, 1, 8, '/heka/home/nursing-workbench/emr/case-sheet', 5),
			(800005, 'Clinical Document', 4, 1, 8, '/heka/home/nursing-workbench/emr/clinical-document', 4),
			(800006, 'Patient Attachment', 4, 1, 8, '/heka/home/nursing-workbench/emr/patient-attachment', 3),
			(800007, 'Order', 4, 1, 8, '/heka/home/nursing-workbench/emr/order', 6),
			(800008, 'Patient Visit History Dashboard', 4, 1, 8, '/heka/home/nursing-workbench/emr/patient-visit-history-dashboard', 7),

			-- CPOE Module
			(11, 'Order', 6, 1, null, '/heka/home/cpoe/order', 1),
			(12, 'Prescription', 6, 1, null, '/heka/home/cpoe/prescription', 2),


			-- Observation Module
			(13, 'EMR', 7, 1, null, '/heka/home/observation/emr', 1),

			-- Billing Module
			(15, 'OP Billing', 8, 1, null, '/heka/home/billing/op-billing', 1),

			-- Refer Module
			(14, 'Refer', 6, 1, null, '/heka/home/cpoe/refer', 3),
			(1400001, 'Refer Doctor', 6, 1, 14, '/heka/home/cpoe/refer/doctor', 1),
			(1400002, 'Referral History', 6, 1, 14, '/heka/home/cpoe/refer/history', 2),

			-- Administration: Financial Year & Prefix Configuration
			(16, 'Prefix Configuration', 1, 1, null, '/heka/home/administration/prefix-configuration', 9),
			(17, 'Financial Year', 1, 1, null, '/heka/home/administration/financial-year', 8),

			-- master department catalog; store per branch linked to user group XOR department
			(18, 'Departments', 1, 1, null, '/heka/home/administration/departments', 10),

			(35, 'Medication Order Setup', 1, 1, null, '/heka/home/administration/medication-order-setup', 12),
			(350001, 'Frequency', 1, 1, 35, '/heka/home/administration/medication-order-setup/frequency', 1),
			(350002, 'Form', 1, 1, 35, '/heka/home/administration/medication-order-setup/form', 2),
			(350003, 'Route', 1, 1, 35, '/heka/home/administration/medication-order-setup/route', 3),
			(350004, 'Duration unit', 1, 1, 35, '/heka/home/administration/medication-order-setup/duration', 4),
			(350005, 'Order type', 1, 1, 35, '/heka/home/administration/medication-order-setup/order-type', 5),
			(350006, 'Dose unit', 1, 1, 35, '/heka/home/administration/medication-order-setup/dose-unit', 6),
			(350007, 'Food relation', 1, 1, 35, '/heka/home/administration/medication-order-setup/food-relation', 7),

			-- Inventory Setup Module (main pages; no parent Inventory Setup page)
			(19, 'Stores', 9, 1, null, '/heka/home/inventory-setup/stores', 1),
			(20, 'Item Master', 9, 1, null, '/heka/home/inventory-setup/item-master', 2),
			(21, 'Pharmacy Generic', 9, 1, null, '/heka/home/inventory-setup/pharmacy-generic', 3),
			(22, 'Unit Master', 9, 1, null, '/heka/home/inventory-setup/unit-master', 4),
			(23, 'Item Unit Master', 9, 1, null, '/heka/home/inventory-setup/item-unit-master', 5),
			(24, 'Manufacture Setup', 9, 1, null, '/heka/home/inventory-setup/manufacture-setup', 6),
			(25, 'Supplier Setup', 9, 1, null, '/heka/home/inventory-setup/supplier-setup', 7),
			(26, 'Approval Config', 9, 1, null, '/heka/home/inventory-setup/approval-config', 8),

			-- Inventory Module (main pages; no parent Inventory page)
			(27, 'Purchase Requisition', 10, 1, null, '/heka/home/inventory/purchase-requisition', 1),
			(28, 'Purchase Order', 10, 1, null, '/heka/home/inventory/purchase-order', 2),
			(29, 'Goods Receipt', 10, 1, null, '/heka/home/inventory/grn', 3),
			(30, 'Stock', 10, 1, null, '/heka/home/inventory/stock', 4),
			(31, 'Store Transfer', 10, 1, null, '/heka/home/inventory/store-transfer', 5),
			(32, 'Stock Issue', 10, 1, null, '/heka/home/inventory/stock-issue', 6),

			-- Medication Order Module
			(33, 'Internal Sales', 11, 1, null, '/heka/home/medication-order/internal-sales', 1),
			(34, 'External Sales', 11, 1, null, '/heka/home/medication-order/external-sales', 2)

		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: page');

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
			(7, 'Stock Issue')
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
			(8, 'Closed', 'closed', 4, 2),

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
			(30, 'Cancelled', 'cancelled', 3, 7)

		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: status tagging');

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
			(5, 'OP Bill', 2, 10, 10, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', true, true,
				'<div><strong>{{hospital.name}}</strong><br/>Bill No: {{document.number}} | Date: {{document.date}}<br/>Patient: {{patient.name}} ({{patient.code}})</div>',
				'<div style="font-size:9px;text-align:center;">Thank you for choosing {{hospital.name}}</div>',
				1),
			(6, 'Nursing Complete (OP) Print', 2, 10, 10, 10, 10, 5, 5, 5, 5, 'A4', 'portrait', true, true,
				'<div style="text-align:center;"><strong>{{hospital.name}}</strong><br/><span style="font-size:12px;">{{hospital.address}}</span></div>',
				'<div style="text-align:center;font-size:10px;">Printed: {{print.date}} {{print.time}} | {{print.by}}</div>',
				1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: document_setting');

	// 9b. System document for nursing complete print (code used by EMR)
	await db.execute(sql`
		INSERT INTO document (id, document_type_id, code, document_text, document_number, document_setting_id, status_id)
		VALUES (
			90001,
			2,
			'NURSING_COMPLETE_PRINT',
			'<p>Visit <strong>{{visit.no}}</strong> - {{patient.name}} ({{patient.code}})</p>{{visit.service_lines_table}}',
			'Nursing complete (OP)',
			6,
			1
		)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: document (nursing complete print)');

	// 8c. Subcategories for EMR/CPOE order “Service Type” filter testing (category_id: 1=RADIOLOGY, 2=NURSING, 5=LAB)
	await db.execute(sql`
		INSERT INTO sub_category (id, category_id, sub_category_name, status_id)
		VALUES
			(90001, 1, '[Dev test] Radiology — General', 1),
			(90002, 2, '[Dev test] Nursing — General', 1),
			(90003, 5, '[Dev test] Laboratory — General', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: sub_category (dev test rows for order service-type filter)');

	// 9. Allergy
	await db.execute(sql`
		INSERT INTO allergy (id, name)
		VALUES
			(1, 'No Known Allergy')
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: allergy');
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
