import { sql } from 'drizzle-orm';
import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidV7 } from '$lib/util/id.util';
import { statusTable } from '../master-table/master-table';
import { StatusEnum } from '../../../../model/enum/db-link';

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

// Better Auth core schema for email/password (see https://www.better-auth.com/docs/concepts/database)

export const userTable = pgTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	roleId: integer('role_id').references(() => roleTable.id),
	/** better-auth twoFactor plugin */
	twoFactorEnabled: boolean('two_factor_enabled')
		.notNull()
		.default(false),
	...timestamps
});

export const sessionTable = pgTable('session', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'string'
	}).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	...timestamps
});

export const accountTable = pgTable('account', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at', {
		withTimezone: true,
		mode: 'string'
	}),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
		withTimezone: true,
		mode: 'string'
	}),
	scope: text('scope'),
	idToken: text('id_token'),
	password: text('password'),
	...timestamps
});

export const verificationTable = pgTable('verification', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	/**
	 * Must be `mode: 'date'` (Date), not string.
	 * Better Auth trust-device / 2FA checks use `expiresAt > new Date()`;
	 * a string expiry always fails that comparison and ignores trusted devices.
	 */
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull(),
	...timestamps
});

/** better-auth twoFactor plugin table */
export const twoFactorTable = pgTable('two_factor', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidV7()),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	secret: text('secret').notNull(),
	backupCodes: text('backup_codes').notNull(),
	...timestamps
});

export const roleTable = pgTable('role', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 512 }),
	statusId: integer('status_id')
		.references(() => statusTable.id)
		.notNull()
		.default(StatusEnum.ACTIVE),
	...timestamps
});

/**
 * Per-page CRUD grants for ADMIN_TEAM users on `/medora/admin/**`.
 * SYSTEM_ADMIN bypasses this table (full access).
 */
export const adminPagePermissionTable = pgTable(
	'admin_page_permission',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		pageKey: varchar('page_key', { length: 64 }).notNull(),
		canView: boolean('can_view').notNull().default(false),
		canCreate: boolean('can_create').notNull().default(false),
		canEdit: boolean('can_edit').notNull().default(false),
		canDelete: boolean('can_delete').notNull().default(false),
		...timestamps
	},
	(t) => [
		unique('admin_page_permission_user_page_unique').on(
			t.userId,
			t.pageKey
		)
	]
);

export const authSchema = {
	user: userTable,
	session: sessionTable,
	account: accountTable,
	verification: verificationTable,
	twoFactor: twoFactorTable,
	role: roleTable,
	adminPagePermission: adminPagePermissionTable
};
