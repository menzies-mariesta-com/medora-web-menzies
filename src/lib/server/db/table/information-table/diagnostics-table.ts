import {
	boolean,
	decimal,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
import { statusTable } from '../master-table/master-table';
import {
	hospitalBranchTable,
	hospitalTable,
	patientTable,
	patientVisitTable,
	serviceItemTable,
	serviceOrderDetailTable,
	staffTable
} from './information-table';

const diagnosticsTimestamps = {
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'string'
	})
		.notNull()
		.defaultNow()
};

export const hospitalLabSettingTable = pgTable(
	'hospital_lab_setting',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		accessionPrefix: varchar('accession_prefix', { length: 32 })
			.notNull()
			.default('LAB'),
		criticalPolicy: varchar('critical_policy', { length: 64 })
			.notNull()
			.default('callback_after_release'),
		autoNursingCompleteOnRelease: boolean('auto_nursing_complete_on_release')
			.notNull()
			.default(false),
		enabledSectionsJson: jsonb('enabled_sections_json')
			.notNull()
			.default(['hematology', 'chemistry', 'microbiology']),
		labelFormatJson: jsonb('label_format_json').notNull().default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('hospital_lab_setting_hospital_uidx').on(t.hospitalId)
	]
);

export const labTestTable = pgTable(
	'lab_test',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		loincCode: varchar('loinc_code', { length: 32 }),
		section: varchar('section', { length: 32 }).notNull(),
		dataType: varchar('data_type', { length: 16 }).notNull().default('numeric'),
		unit: varchar('unit', { length: 64 }),
		refRangeLow: decimal('ref_range_low', { precision: 14, scale: 4 }),
		refRangeHigh: decimal('ref_range_high', { precision: 14, scale: 4 }),
		refRangeText: varchar('ref_range_text', { length: 256 }),
		criticalLow: decimal('critical_low', { precision: 14, scale: 4 }),
		criticalHigh: decimal('critical_high', { precision: 14, scale: 4 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_test_hospital_idx').on(t.hospitalId),
		index('lab_test_section_idx').on(t.section)
	]
);

export const labPanelTable = pgTable(
	'lab_panel',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		section: varchar('section', { length: 32 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_panel_hospital_idx').on(t.hospitalId)]
);

export const labPanelMemberTable = pgTable(
	'lab_panel_member',
	{
		id: serial('id').primaryKey(),
		panelId: integer('panel_id')
			.notNull()
			.references(() => labPanelTable.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => labTestTable.id, { onDelete: 'cascade' }),
		sortOrder: integer('sort_order').notNull().default(1),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_panel_member_panel_test_uidx').on(t.panelId, t.testId)
	]
);

export const labServiceTestMapTable = pgTable(
	'lab_service_test_map',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		serviceItemId: integer('service_item_id')
			.notNull()
			.references(() => serviceItemTable.id, { onDelete: 'cascade' }),
		targetType: varchar('target_type', { length: 16 }).notNull(),
		targetId: integer('target_id').notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_service_test_map_service_uidx').on(
			t.hospitalId,
			t.serviceItemId
		)
	]
);

export const labOrderTable = pgTable(
	'lab_order',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id, { onDelete: 'cascade' }),
		serviceOrderDetailId: integer('service_order_detail_id')
			.notNull()
			.references(() => serviceOrderDetailTable.id, { onDelete: 'cascade' }),
		priority: varchar('priority', { length: 16 }).notNull().default('routine'),
		clinicalNotes: text('clinical_notes'),
		orderStatus: varchar('order_status', { length: 32 })
			.notNull()
			.default('ordered'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_order_service_order_detail_uidx').on(t.serviceOrderDetailId),
		index('lab_order_visit_idx').on(t.visitId),
		index('lab_order_hospital_idx').on(t.hospitalId)
	]
);

export const labAccessionTable = pgTable(
	'lab_accession',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		labOrderId: integer('lab_order_id')
			.notNull()
			.references(() => labOrderTable.id, { onDelete: 'cascade' }),
		accessionNo: varchar('accession_no', { length: 64 }).notNull(),
		barcodePayload: varchar('barcode_payload', { length: 256 }).notNull(),
		section: varchar('section', { length: 32 }).notNull(),
		accessionStatus: varchar('accession_status', { length: 32 })
			.notNull()
			.default('ordered'),
		requestedTestsJson: jsonb('requested_tests_json').notNull().default([]),
		collectionSite: varchar('collection_site', { length: 256 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		uniqueIndex('lab_accession_no_hospital_uidx').on(t.hospitalId, t.accessionNo),
		index('lab_accession_status_idx').on(t.hospitalId, t.section, t.accessionStatus)
	]
);

export const labSpecimenTable = pgTable(
	'lab_specimen',
	{
		id: serial('id').primaryKey(),
		accessionId: integer('accession_id')
			.notNull()
			.references(() => labAccessionTable.id, { onDelete: 'cascade' }),
		specimenType: varchar('specimen_type', { length: 32 }).notNull(),
		collectedAt: timestamp('collected_at', {
			withTimezone: true,
			mode: 'string'
		}),
		collectedBy: uuid('collected_by').references(() => staffTable.id),
		receivedAt: timestamp('received_at', {
			withTimezone: true,
			mode: 'string'
		}),
		receivedBy: uuid('received_by').references(() => staffTable.id),
		rejectReason: varchar('reject_reason', { length: 32 }),
		rejectNote: text('reject_note'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_specimen_accession_idx').on(t.accessionId)]
);

export const labResultReportTable = pgTable(
	'lab_result_report',
	{
		id: serial('id').primaryKey(),
		accessionId: integer('accession_id')
			.notNull()
			.references(() => labAccessionTable.id, { onDelete: 'cascade' }),
		reportStatus: varchar('report_status', { length: 16 })
			.notNull()
			.default('preliminary'),
		releasedAt: timestamp('released_at', {
			withTimezone: true,
			mode: 'string'
		}),
		releasedBy: uuid('released_by').references(() => staffTable.id),
		verifiedAt: timestamp('verified_at', {
			withTimezone: true,
			mode: 'string'
		}),
		verifiedBy: uuid('verified_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [index('lab_result_report_accession_idx').on(t.accessionId)]
);

export const labResultObservationTable = pgTable(
	'lab_result_observation',
	{
		id: serial('id').primaryKey(),
		reportId: integer('report_id')
			.notNull()
			.references(() => labResultReportTable.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => labTestTable.id),
		valueNumeric: decimal('value_numeric', { precision: 14, scale: 4 }),
		valueText: text('value_text'),
		unit: varchar('unit', { length: 64 }),
		refRangeText: varchar('ref_range_text', { length: 256 }),
		abnormalFlag: varchar('abnormal_flag', { length: 8 }),
		isCritical: boolean('is_critical').notNull().default(false),
		observationStatus: varchar('observation_status', { length: 16 })
			.notNull()
			.default('draft'),
		source: varchar('source', { length: 16 }).notNull().default('manual'),
		enteredBy: uuid('entered_by').references(() => staffTable.id),
		verifiedBy: uuid('verified_by').references(() => staffTable.id),
		verifiedAt: timestamp('verified_at', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_result_observation_report_idx').on(t.reportId),
		index('lab_result_observation_critical_idx').on(t.isCritical)
	]
);

export const labCriticalCallbackTable = pgTable(
	'lab_critical_callback',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		observationId: integer('observation_id')
			.notNull()
			.references(() => labResultObservationTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		callbackStatus: varchar('callback_status', { length: 32 })
			.notNull()
			.default('open'),
		calledParty: varchar('called_party', { length: 256 }),
		readBackText: text('read_back_text'),
		calledAt: timestamp('called_at', { withTimezone: true, mode: 'string' }),
		completedAt: timestamp('completed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		completedBy: uuid('completed_by').references(() => staffTable.id),
		assignedStaffId: uuid('assigned_staff_id').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_critical_callback_hospital_status_idx').on(
			t.hospitalId,
			t.callbackStatus
		)
	]
);

export const labAuditTable = pgTable(
	'lab_audit',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		entityType: varchar('entity_type', { length: 64 }).notNull(),
		entityId: integer('entity_id').notNull(),
		action: varchar('action', { length: 64 }).notNull(),
		staffId: uuid('staff_id').references(() => staffTable.id),
		detailJson: jsonb('detail_json'),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('lab_audit_entity_idx').on(t.entityType, t.entityId),
		index('lab_audit_hospital_idx').on(t.hospitalId)
	]
);

export const labIntegrationMessageTable = pgTable(
	'lab_integration_message',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		direction: varchar('direction', { length: 16 }).notNull(),
		protocol: varchar('protocol', { length: 32 }).notNull().default('hl7_v2'),
		rawPayload: text('raw_payload').notNull(),
		parseStatus: varchar('parse_status', { length: 16 })
			.notNull()
			.default('pending'),
		parseError: text('parse_error'),
		accessionNo: varchar('accession_no', { length: 64 }),
		processedAt: timestamp('processed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...diagnosticsTimestamps
	},
	(t) => [
		index('lab_integration_message_hospital_status_idx').on(
			t.hospitalId,
			t.parseStatus
		)
	]
);
