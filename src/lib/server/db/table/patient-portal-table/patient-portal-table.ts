import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { uuidV7 } from '$lib/util/id.util';
import { hospitalTable, patientTable } from '../information-table/information-table';
import { userTable } from '../auth-table/auth-table';

export const patientDeviceTokenTable = pgTable('patient_device_token', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	patientId: uuid('patient_id')
		.notNull()
		.references(() => patientTable.id, { onDelete: 'cascade' }),
	hospitalId: uuid('hospital_id')
		.notNull()
		.references(() => hospitalTable.id, { onDelete: 'cascade' }),
	installationId: text('installation_id').notNull(),
	fcmToken: text('fcm_token').notNull(),
	platform: varchar('platform', { length: 32 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
		.notNull()
		.defaultNow()
});

export const patientPortalAuditTable = pgTable('patient_portal_audit', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	userId: text('user_id').notNull(),
	patientId: uuid('patient_id').notNull(),
	hospitalId: uuid('hospital_id').notNull(),
	endpoint: text('endpoint').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
		.notNull()
		.defaultNow()
});
