import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/pg-core';
import { StatusEnum } from '../../../../model/enum/db-link';
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
		.$onUpdate(() => sql`now()`)
} as const;

/**
 * Marketplace app master.
 */
export const marketplaceAppTable = pgTable(
	'marketplace_app',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 128 }),
		signature: varchar('signature', { length: 128 }).notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('marketplace_app_name_idx').on(table.name),
		index('marketplace_app_code_idx').on(table.code),
		index('marketplace_app_signature_idx').on(table.signature),
		index('marketplace_app_status_id_idx').on(table.statusId)
	]
);

/**
 * Marketplace app form master.
 */
export const marketplaceAppFormTable = pgTable(
	'marketplace_app_form',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 512 }).notNull(),
		code: varchar('code', { length: 128 }),
		appId: integer('app_id')
			.references(() => marketplaceAppTable.id)
			.notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('marketplace_app_form_name_idx').on(table.name),
		index('marketplace_app_form_code_idx').on(table.code),
		index('marketplace_app_form_app_id_idx').on(table.appId),
		index('marketplace_app_form_status_id_idx').on(table.statusId)
	]
);

/**
 * Allowed file extensions for app archives.
 */
export const marketplaceAllowedFileExtensionTable = pgTable(
	'marketplace_allowed_file_extension',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		code: varchar('code', { length: 64 }),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('marketplace_allowed_file_extension_name_idx').on(table.name),
		index('marketplace_allowed_file_extension_code_idx').on(table.code),
		index('marketplace_allowed_file_extension_status_id_idx').on(
			table.statusId
		)
	]
);

/**
 * Archive versions per app.
 */
export const marketplaceAppArchiveTable = pgTable(
	'marketplace_app_archive',
	{
		id: serial('id').primaryKey(),
		version: varchar('version', { length: 100 }).notNull(),
		downloadUrl: text('download_url').notNull(),
		appId: integer('app_id')
			.references(() => marketplaceAppTable.id)
			.notNull(),
		fileExtensionId: integer('file_extension_id')
			.references(() => marketplaceAllowedFileExtensionTable.id)
			.notNull(),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...timestamps
	},
	(table) => [
		index('marketplace_app_archive_version_idx').on(table.version),
		index('marketplace_app_archive_app_id_idx').on(table.appId),
		index('marketplace_app_archive_file_extension_id_idx').on(
			table.fileExtensionId
		),
		index('marketplace_app_archive_status_id_idx').on(table.statusId)
	]
);