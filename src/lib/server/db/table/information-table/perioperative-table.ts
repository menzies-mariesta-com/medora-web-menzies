import {
	boolean,
	decimal,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { StatusEnum } from '../../../../model/enum/db-link';
import { statusTable } from '../master-table/master-table';
import {
	hospitalBranchTable,
	hospitalTable,
	ipdAdmissionTable,
	patientTable,
	patientVisitTable,
	serviceOrderDetailTable,
	staffTable,
	statusTaggingTable
} from './information-table';
import { itemBatchTable } from './inventory-transaction-table';
import {
	edTriageLevelTable,
	erBedTable,
	erRoomTable,
	erWardTable
} from './er-master-table';

const perioperativeTimestamps = {
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

export const clinicalFormTemplateTable = pgTable(
	'clinical_form_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
			onDelete: 'cascade'
		}),
		code: varchar('code', { length: 128 }).notNull(),
		version: integer('version').notNull().default(1),
		title: varchar('title', { length: 512 }).notNull(),
		schemaJson: jsonb('schema_json').notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		uniqueIndex('clinical_form_template_code_hospital_uidx').on(
			t.code,
			sql`COALESCE(${t.hospitalId}, '00000000-0000-0000-0000-000000000000'::uuid)`
		)
	]
);

export const clinicalFormInstanceTable = pgTable(
	'clinical_form_instance',
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
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		surgicalCaseId: integer('surgical_case_id'),
		templateId: integer('template_id')
			.notNull()
			.references(() => clinicalFormTemplateTable.id),
		contextType: varchar('context_type', { length: 64 }).notNull(),
		valuesJson: jsonb('values_json').notNull().default({}),
		statusTaggingId: integer('status_tagging_id').references(
			() => statusTaggingTable.id
		),
		signedAt: timestamp('signed_at', {
			withTimezone: true,
			mode: 'string'
		}),
		signedBy: uuid('signed_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		index('clinical_form_instance_visit_idx').on(t.visitId),
		index('clinical_form_instance_case_idx').on(t.surgicalCaseId)
	]
);

export const otRoomTable = pgTable(
	'ot_room',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		branchId: uuid('branch_id')
			.notNull()
			.references(() => hospitalBranchTable.id),
		name: varchar('name', { length: 256 }).notNull(),
		sequenceNo: integer('sequence_no').notNull().default(0),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('ot_room_hospital_branch_idx').on(t.hospitalId, t.branchId)]
);

export const surgicalCaseTable = pgTable(
	'surgical_case',
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
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		admissionId: integer('admission_id').references(
			() => ipdAdmissionTable.id,
			{ onDelete: 'set null' }
		),
		serviceOrderDetailId: integer('service_order_detail_id').references(
			() => serviceOrderDetailTable.id,
			{ onDelete: 'set null' }
		),
		otRoomId: integer('ot_room_id').references(() => otRoomTable.id, {
			onDelete: 'set null'
		}),
		procedureName: varchar('procedure_name', { length: 512 })
			.notNull()
			.default(''),
		caseType: varchar('case_type', { length: 32 })
			.notNull()
			.default('general'),
		priority: varchar('priority', { length: 32 })
			.notNull()
			.default('elective'),
		statusTaggingId: integer('status_tagging_id')
			.notNull()
			.references(() => statusTaggingTable.id),
		scheduledStart: timestamp('scheduled_start', {
			withTimezone: true,
			mode: 'string'
		}),
		scheduledEnd: timestamp('scheduled_end', {
			withTimezone: true,
			mode: 'string'
		}),
		actualStart: timestamp('actual_start', {
			withTimezone: true,
			mode: 'string'
		}),
		actualEnd: timestamp('actual_end', {
			withTimezone: true,
			mode: 'string'
		}),
		preOpCompleteAt: timestamp('pre_op_complete_at', {
			withTimezone: true,
			mode: 'string'
		}),
		displacedByCaseId: integer('displaced_by_case_id'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [
		index('surgical_case_hospital_idx').on(t.hospitalId),
		index('surgical_case_visit_idx').on(t.visitId),
		index('surgical_case_room_schedule_idx').on(
			t.otRoomId,
			t.scheduledStart
		)
	]
);

export const surgicalCaseStaffTable = pgTable(
	'surgical_case_staff',
	{
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		staffId: uuid('staff_id')
			.notNull()
			.references(() => staffTable.id),
		roleCode: varchar('role_code', { length: 32 }).notNull()
	},
	(t) => [
		primaryKey({
			columns: [t.surgicalCaseId, t.staffId, t.roleCode]
		})
	]
);

export const surgicalCaseAuditTable = pgTable(
	'surgical_case_audit',
	{
		id: serial('id').primaryKey(),
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		action: varchar('action', { length: 64 }).notNull(),
		detailJson: jsonb('detail_json'),
		staffId: uuid('staff_id').references(() => staffTable.id),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [index('surgical_case_audit_case_idx').on(t.surgicalCaseId)]
);

export const edEncounterTable = pgTable(
	'ed_encounter',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		boardColumn: varchar('board_column', { length: 64 })
			.notNull()
			.default('waiting_triage'),
		fastTrack: boolean('fast_track').notNull().default(false),
		triageSystem: varchar('triage_system', { length: 16 }),
		triageFormInstanceId: integer('triage_form_instance_id'),
		acuityLevel: varchar('acuity_level', { length: 32 }),
		edTriageLevelId: integer('ed_triage_level_id').references(
			() => edTriageLevelTable.id,
			{ onDelete: 'set null' }
		),
		isMlc: boolean('is_mlc').notNull().default(false),
		registrationRemarks: text('registration_remarks'),
		assignedDoctorId: uuid('assigned_doctor_id').references(
			() => staffTable.id
		),
		erWardId: integer('er_ward_id').references(() => erWardTable.id, {
			onDelete: 'set null'
		}),
		erRoomId: integer('er_room_id').references(() => erRoomTable.id, {
			onDelete: 'set null'
		}),
		erBedId: integer('er_bed_id').references(() => erBedTable.id, {
			onDelete: 'set null'
		}),
		erBedAssignedAt: timestamp('er_bed_assigned_at', {
			withTimezone: true,
			mode: 'string'
		}),
		arrivedAt: timestamp('arrived_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		dischargedAt: timestamp('discharged_at', {
			withTimezone: true,
			mode: 'string'
		}),
		retainErBedAfterDischarge: boolean('retain_er_bed_after_discharge')
			.notNull()
			.default(false),
		dischargeRemarks: text('discharge_remarks'),
		erBedChargeServiceOrderDetailId: integer(
			'er_bed_charge_service_order_detail_id'
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [uniqueIndex('ed_encounter_visit_uidx').on(t.visitId)]
);

export const traumaActivationTable = pgTable(
	'trauma_activation',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		levelCode: varchar('level_code', { length: 16 }).notNull(),
		activatedAt: timestamp('activated_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		deactivatedAt: timestamp('deactivated_at', {
			withTimezone: true,
			mode: 'string'
		}),
		formInstanceId: integer('form_instance_id'),
		activatedBy: uuid('activated_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('trauma_activation_hospital_idx').on(t.hospitalId)]
);

export const surgicalCaseImplantTable = pgTable(
	'surgical_case_implant',
	{
		id: serial('id').primaryKey(),
		surgicalCaseId: integer('surgical_case_id')
			.notNull()
			.references(() => surgicalCaseTable.id, { onDelete: 'cascade' }),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		itemBatchId: integer('item_batch_id').references(
			() => itemBatchTable.id,
			{ onDelete: 'set null' }
		),
		udiRaw: varchar('udi_raw', { length: 512 }),
		quantity: decimal('quantity', { precision: 14, scale: 4 })
			.notNull()
			.default('1'),
		departmentConsumptionId: uuid('department_consumption_id'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [index('surgical_case_implant_case_idx').on(t.surgicalCaseId)]
);

export const hospitalPerioperativeSettingTable = pgTable(
	'hospital_perioperative_setting',
	{
		hospitalId: uuid('hospital_id')
			.primaryKey()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		defaultEdTriageSystem: varchar('default_ed_triage_system', {
			length: 16
		})
			.notNull()
			.default('esi'),
		preOpMandatory: boolean('pre_op_mandatory').notNull().default(true),
		whoBlockWithoutTimeout: boolean('who_block_without_timeout')
			.notNull()
			.default(false),
		updatedAt: timestamp('updated_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	}
);

export const ldEncounterTable = pgTable(
	'ld_encounter',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		visitId: uuid('visit_id')
			.notNull()
			.references(() => patientVisitTable.id, { onDelete: 'cascade' }),
		boardColumn: varchar('board_column', { length: 64 })
			.notNull()
			.default('active_labor'),
		partogramFormInstanceId: integer('partogram_form_instance_id'),
		deliveryFormInstanceId: integer('delivery_form_instance_id'),
		surgicalCaseId: integer('surgical_case_id').references(
			() => surgicalCaseTable.id,
			{ onDelete: 'set null' }
		),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...perioperativeTimestamps
	},
	(t) => [uniqueIndex('ld_encounter_visit_uidx').on(t.visitId)]
);
