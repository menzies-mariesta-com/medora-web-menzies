import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	decimal,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
import { userTable } from '../auth-table/auth-table';
import { statusTable } from '../master-table/master-table';
import {
	hospitalBranchTable,
	hospitalTable,
	itemMasterTable,
	patientTable,
	patientVisitTable,
	progressNoteTable,
	staffTable
} from './information-table';
import {
	medicationOrderBatchTable,
	medicationOrderLineTable
} from './medication-order-table';

const clinicalTimestamps = {
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
		.$onUpdate(() => sql`now()`)
} as const;

/** Structured order set header (feature 63). */
export const clinicalOrderSetTable = pgTable(
	'clinical_order_set',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 512 }).notNull(),
		specialtyTag: varchar('specialty_tag', { length: 128 }),
		version: integer('version').notNull().default(1),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_hospital_idx').on(t.hospitalId)]
);

export const clinicalOrderSetTriggerTable = pgTable(
	'clinical_order_set_trigger',
	{
		id: serial('id').primaryKey(),
		orderSetId: integer('order_set_id')
			.notNull()
			.references(() => clinicalOrderSetTable.id, {
				onDelete: 'cascade'
			}),
		triggerType: varchar('trigger_type', { length: 32 }).notNull(),
		triggerRefId: integer('trigger_ref_id'),
		triggerRefCode: varchar('trigger_ref_code', { length: 128 }),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_trigger_set_idx').on(t.orderSetId)]
);

export const clinicalOrderSetLineTable = pgTable(
	'clinical_order_set_line',
	{
		id: serial('id').primaryKey(),
		orderSetId: integer('order_set_id')
			.notNull()
			.references(() => clinicalOrderSetTable.id, {
				onDelete: 'cascade'
			}),
		lineNo: integer('line_no').notNull().default(1),
		lineType: varchar('line_type', { length: 32 }).notNull(),
		payloadJson: jsonb('payload_json').notNull().default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('clinical_order_set_line_set_idx').on(t.orderSetId)]
);

/** CDS prescribing alerts (feature 64). */
export const prescribingAlertTable = pgTable(
	'prescribing_alert',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		batchId: integer('batch_id').references(
			() => medicationOrderBatchTable.id,
			{ onDelete: 'set null' }
		),
		alertType: varchar('alert_type', { length: 64 }).notNull(),
		severity: varchar('severity', { length: 16 }).notNull(),
		message: text('message').notNull(),
		conceptRef: varchar('concept_ref', { length: 64 }),
		overridden: boolean('overridden').notNull().default(false),
		overrideReasonCode: varchar('override_reason_code', { length: 64 }),
		overrideRemark: text('override_remark'),
		overriddenBy: uuid('overridden_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		overriddenAt: timestamp('overridden_at', { withTimezone: true }),
		createdBy: uuid('created_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		...clinicalTimestamps
	},
	(t) => [
		index('prescribing_alert_hospital_idx').on(t.hospitalId),
		index('prescribing_alert_batch_idx').on(t.batchId)
	]
);

/** Hospital formulary tier (feature 65). */
export const hospitalFormularyItemTable = pgTable(
	'hospital_formulary_item',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		tier: varchar('tier', { length: 32 }).notNull(),
		effectiveFrom: date('effective_from'),
		effectiveTo: date('effective_to'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('hospital_formulary_item_hospital_item_uidx').on(
			t.hospitalId,
			t.itemMasterId
		)
	]
);

export const formularySubstitutionRuleTable = pgTable(
	'formulary_substitution_rule',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		restrictedItemMasterId: integer('restricted_item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		preferredItemMasterId: integer('preferred_item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		conditionsJson: jsonb('conditions_json').default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('formulary_sub_rule_hospital_idx').on(t.hospitalId)]
);

/** BCMA product barcode (feature 66). */
export const pharmacyProductIdentifierTable = pgTable(
	'pharmacy_product_identifier',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemMasterId: integer('item_master_id')
			.notNull()
			.references(() => itemMasterTable.id, { onDelete: 'cascade' }),
		barcodeValue: varchar('barcode_value', { length: 128 }).notNull(),
		identifierType: varchar('identifier_type', { length: 16 }).notNull(),
		isPrimary: boolean('is_primary').notNull().default(false),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('pharmacy_product_id_hospital_barcode_uidx').on(
			t.hospitalId,
			t.barcodeValue
		),
		index('pharmacy_product_id_item_idx').on(t.itemMasterId)
	]
);

/** Scheduled dose from active med order line (feature 66). */
export const medicationOrderScheduleTable = pgTable(
	'medication_order_schedule',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'cascade'
			}),
		scheduledAt: timestamp('scheduled_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		doseLabel: varchar('dose_label', { length: 256 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		index('med_order_schedule_visit_idx').on(t.visitId),
		index('med_order_schedule_due_idx').on(t.scheduledAt)
	]
);

export const medicationAdministrationTable = pgTable(
	'medication_administration',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		scheduleId: integer('schedule_id').references(
			() => medicationOrderScheduleTable.id,
			{ onDelete: 'set null' }
		),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'restrict'
			}),
		administrationStatus: varchar('administration_status', {
			length: 32
		}).notNull(),
		administeredAt: timestamp('administered_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		scannedPatientToken: varchar('scanned_patient_token', {
			length: 256
		}),
		scannedProductBarcode: varchar('scanned_product_barcode', {
			length: 128
		}),
		scannedNurseCode: varchar('scanned_nurse_code', { length: 128 }),
		nurseStaffId: uuid('nurse_staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		lateReason: text('late_reason'),
		remark: text('remark'),
		...clinicalTimestamps
	},
	(t) => [
		index('med_administration_visit_idx').on(t.visitId),
		index('med_administration_schedule_idx').on(t.scheduleId)
	]
);

/** IV infusion extension (feature 67). */
export const medicationOrderInfusionTable = pgTable(
	'medication_order_infusion',
	{
		id: serial('id').primaryKey(),
		lineId: integer('line_id')
			.notNull()
			.references(() => medicationOrderLineTable.id, {
				onDelete: 'cascade'
			}),
		infusionType: varchar('infusion_type', { length: 32 }).notNull(),
		totalVolumeMl: decimal('total_volume_ml', {
			precision: 18,
			scale: 6
		}),
		rateMlHr: decimal('rate_ml_hr', { precision: 18, scale: 6 }),
		rateWeightBasedJson: jsonb('rate_weight_based_json'),
		diluentItemMasterId: integer('diluent_item_master_id').references(
			() => itemMasterTable.id,
			{ onDelete: 'set null' }
		),
		concentration: varchar('concentration', { length: 128 }),
		pumpId: varchar('pump_id', { length: 128 }),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('med_order_infusion_line_uidx').on(t.lineId)
	]
);

/** Nursing care plan templates (feature 68). */
export const nursingCarePlanTemplateTable = pgTable(
	'nursing_care_plan_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 512 }).notNull(),
		nandaLabel: varchar('nanda_label', { length: 256 }),
		sectionsJson: jsonb('sections_json').notNull().default([]),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('nursing_care_plan_tpl_hospital_idx').on(t.hospitalId)]
);

export const nursingCarePlanInstanceTable = pgTable(
	'nursing_care_plan_instance',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id),
		templateId: integer('template_id').references(
			() => nursingCarePlanTemplateTable.id,
			{ onDelete: 'set null' }
		),
		contentJson: jsonb('content_json').notNull().default({}),
		signedAt: timestamp('signed_at', { withTimezone: true }),
		signedBy: uuid('signed_by').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [index('nursing_care_plan_inst_visit_idx').on(t.visitId)]
);

/** Clinical alerts inbox (feature 69). */
export const clinicalAlertTable = pgTable(
	'clinical_alert',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		ruleCode: varchar('rule_code', { length: 64 }).notNull(),
		severity: varchar('severity', { length: 16 }).notNull(),
		title: varchar('title', { length: 512 }).notNull(),
		message: text('message').notNull(),
		payloadJson: jsonb('payload_json').default({}),
		alertStatus: varchar('alert_status', { length: 32 })
			.notNull()
			.default('open'),
		assignedStaffId: uuid('assigned_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
		acknowledgedBy: uuid('acknowledged_by').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
		...clinicalTimestamps
	},
	(t) => [
		index('clinical_alert_hospital_status_idx').on(
			t.hospitalId,
			t.alertStatus
		),
		index('clinical_alert_visit_idx').on(t.visitId)
	]
);

/** Progress note addendum (feature 71). */
export const progressNoteAddendumReasonTable = pgTable(
	'progress_note_addendum_reason',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		label: varchar('label', { length: 256 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('progress_note_addendum_reason_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		)
	]
);

export const progressNoteAddendumTable = pgTable(
	'progress_note_addendum',
	{
		id: serial('id').primaryKey(),
		progressNoteId: integer('progress_note_id')
			.notNull()
			.references(() => progressNoteTable.id, { onDelete: 'cascade' }),
		reasonCode: varchar('reason_code', { length: 64 }).notNull(),
		body: text('body').notNull(),
		authorStaffId: uuid('author_staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [
		index('progress_note_addendum_note_idx').on(t.progressNoteId)
	]
);

/** ROI tracking (feature 72). */
export const roiRequestTable = pgTable(
	'roi_request',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		requesterName: varchar('requester_name', { length: 512 }).notNull(),
		requesterContact: varchar('requester_contact', { length: 256 }),
		scopeDescription: text('scope_description').notNull(),
		requestStatus: varchar('request_status', { length: 32 }).notNull(),
		dueDate: date('due_date'),
		assignedStaffId: uuid('assigned_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		...clinicalTimestamps
	},
	(t) => [index('roi_request_hospital_status_idx').on(t.hospitalId)]
);

export const roiRequestEventTable = pgTable(
	'roi_request_event',
	{
		id: serial('id').primaryKey(),
		roiRequestId: integer('roi_request_id')
			.notNull()
			.references(() => roiRequestTable.id, { onDelete: 'cascade' }),
		eventType: varchar('event_type', { length: 64 }).notNull(),
		remark: text('remark'),
		staffId: uuid('staff_id').references(() => staffTable.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [index('roi_request_event_request_idx').on(t.roiRequestId)]
);

/** Immunization (feature 74). */
export const immunizationMasterTable = pgTable(
	'immunization_master',
	{
		id: serial('id').primaryKey(),
		cvxCode: varchar('cvx_code', { length: 16 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		scheduleRulesJson: jsonb('schedule_rules_json').default([]),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [uniqueIndex('immunization_master_cvx_uidx').on(t.cvxCode)]
);

export const patientImmunizationTable = pgTable(
	'patient_immunization',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		visitId: uuid('visit_id').references(() => patientVisitTable.id, {
			onDelete: 'set null'
		}),
		immunizationMasterId: integer('immunization_master_id')
			.notNull()
			.references(() => immunizationMasterTable.id, {
				onDelete: 'restrict'
			}),
		administeredOn: date('administered_on').notNull(),
		doseSequence: integer('dose_sequence').notNull().default(1),
		lotNumber: varchar('lot_number', { length: 128 }),
		site: varchar('site', { length: 128 }),
		administratorStaffId: uuid('administrator_staff_id').references(
			() => staffTable.id,
			{ onDelete: 'set null' }
		),
		visGiven: boolean('vis_given').notNull().default(false),
		remark: text('remark'),
		...clinicalTimestamps
	},
	(t) => [index('patient_immunization_patient_idx').on(t.patientId)]
);

/** Chronic disease registry (feature 75). */
export const registryDefinitionTable = pgTable(
	'registry_definition',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 512 }).notNull(),
		inclusionRulesJson: jsonb('inclusion_rules_json').default({}),
		recallIntervalDays: integer('recall_interval_days').default(90),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('registry_definition_hospital_code_uidx').on(
			t.hospitalId,
			t.code
		)
	]
);

export const registryMemberTable = pgTable(
	'registry_member',
	{
		id: serial('id').primaryKey(),
		registryDefinitionId: integer('registry_definition_id')
			.notNull()
			.references(() => registryDefinitionTable.id, {
				onDelete: 'cascade'
			}),
		patientId: uuid('patient_id')
			.notNull()
			.references(() => patientTable.id),
		enrolledAt: timestamp('enrolled_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		lastReviewAt: timestamp('last_review_at', {
			withTimezone: true,
			mode: 'string'
		}),
		nextRecallDate: date('next_recall_date'),
		memberStatus: varchar('member_status', { length: 32 }).notNull(),
		...clinicalTimestamps
	},
	(t) => [
		uniqueIndex('registry_member_registry_patient_uidx').on(
			t.registryDefinitionId,
			t.patientId
		),
		index('registry_member_recall_idx').on(t.nextRecallDate)
	]
);
