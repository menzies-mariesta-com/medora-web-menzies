import { sql } from 'drizzle-orm';
import {
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
import {
	StatusColorEnum as StatusColorEnumValue
} from '../../../../model/enum/color.enum';

import { userTable } from '../auth-table/auth-table';
import {
	hospitalTable,
	patientVisitTable,
	referHistoryTable,
	staffTable
} from '../information-table/information-table';
import { statusTable } from '../master-table/master-table';

const timestamps = {
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
		.$onUpdate(() => sql`now()`),
	// Soft delete (optional)
	deletedAt: timestamp('deleted_at', {
		withTimezone: true,
		mode: 'string'
	})
} as const;

/**
 * Notifications are persisted per staff recipient.
 *
 * - `hospital_id` is optional; when present it allows scoping the bell UI to a hospital.
 * - `read_at` tracks per-user read state (unread when null).
 * - `event_type` enables multiple modules to reuse the same notification UI.
 */
export const notificationTable = pgTable('notification', {
	// Surrogate key for UI list rendering
	id: serial('id').primaryKey(),

	recipientStaffId: uuid('recipient_staff_id')
		.notNull()
		.references(() => staffTable.id, { onDelete: 'cascade' }),

	// Optional scoping (e.g. refer history uses patient_visit.hospital_id)
	hospitalId: uuid('hospital_id').references(() => hospitalTable.id, {
		onDelete: 'set null'
	}),

	// Event categorization: REFER_CREATED | REFER_ACCEPTED | REFER_REJECTED | REFER_CANCELED
	eventType: varchar('event_type', { length: 64 }).notNull(),

	// Matches frontend `StatusColorEnum` values (success/info/warning/error)
	severity: varchar('severity', { length: 16 })
		.notNull()
		.default(StatusColorEnumValue.INFO),

	// Display content
	title: text('title'),
	message: text('message').notNull(),
	link: text('link'),

	// Optional references for UI routing
	visitId: integer('visit_id').references(() => patientVisitTable.id),
	referHistoryId: integer('refer_history_id').references(
		() => referHistoryTable.id
	),

	// Read/unread
	readAt: timestamp('read_at', {
		withTimezone: true,
		mode: 'string'
	}),

	// Status + soft delete
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps,

	// Audit fields (auto-filled by `$lib/server/db` when columns exist)
	createdBy: text('created_by').references(() => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	updatedBy: text('updated_by').references(() => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	}),
	deletedBy: text('deleted_by').references(() => userTable.id, {
		onDelete: 'set null',
		onUpdate: 'cascade'
	})
});

