import {
	boolean,
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
	documentSettingTable,
	documentTable,
	documentTypeTable,
	hospitalTable,
	staffTable
} from './information-table';

const catalogTimestamps = {
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

export const hospitalDocumentSettingTable = pgTable(
	'hospital_document_setting',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		defaultCatalogLocale: varchar('default_catalog_locale', { length: 16 })
			.notNull()
			.default('en'),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...catalogTimestamps
	},
	(t) => [uniqueIndex('hospital_document_setting_hospital_uidx').on(t.hospitalId)]
);

export const documentCatalogTable = pgTable(
	'document_catalog',
	{
		catalogCode: varchar('catalog_code', { length: 128 }).primaryKey(),
		kind: varchar('kind', { length: 32 }).notNull().default('html_print'),
		category: varchar('category', { length: 64 }).notNull(),
		title: varchar('title', { length: 512 }).notNull(),
		description: text('description'),
		tagsJson: jsonb('tags_json').notNull().default([]),
		surfacesJson: jsonb('surfaces_json').notNull().default(['emr_clinical']),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypeTable.id),
		systemDocumentId: integer('system_document_id').references(
			() => documentTable.id,
			{ onDelete: 'set null' }
		),
		catalogVersion: integer('catalog_version').notNull().default(1),
		defaultDocumentSettingId: integer('default_document_setting_id').references(
			() => documentSettingTable.id
		),
		localeDocumentIdsJson: jsonb('locale_document_ids_json')
			.notNull()
			.default({}),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...catalogTimestamps
	},
	(t) => [
		index('document_catalog_category_idx').on(t.category),
		index('document_catalog_kind_idx').on(t.kind)
	]
);

export const hospitalDocumentTemplateTable = pgTable(
	'hospital_document_template',
	{
		id: serial('id').primaryKey(),
		hospitalId: uuid('hospital_id')
			.notNull()
			.references(() => hospitalTable.id, { onDelete: 'cascade' }),
		catalogCode: varchar('catalog_code', { length: 128 })
			.notNull()
			.references(() => documentCatalogTable.catalogCode, { onDelete: 'cascade' }),
		locale: varchar('locale', { length: 16 }).notNull().default('en'),
		isEnabled: boolean('is_enabled').notNull().default(true),
		documentId: integer('document_id')
			.notNull()
			.references(() => documentTable.id, { onDelete: 'cascade' }),
		documentSettingId: integer('document_setting_id').references(
			() => documentSettingTable.id
		),
		forkedFromCatalogVersion: integer('forked_from_catalog_version'),
		enabledAt: timestamp('enabled_at', {
			withTimezone: true,
			mode: 'string'
		}),
		enabledBy: uuid('enabled_by').references(() => staffTable.id),
		statusId: integer('status_id')
			.references(() => statusTable.id)
			.notNull()
			.default(StatusEnum.ACTIVE),
		...catalogTimestamps
	},
	(t) => [
		uniqueIndex('hospital_document_template_hospital_catalog_uidx').on(
			t.hospitalId,
			t.catalogCode
		),
		index('hospital_document_template_hospital_enabled_idx').on(
			t.hospitalId,
			t.isEnabled
		)
	]
);
