import { sql } from 'drizzle-orm';
import {
	boolean,
	pgTable,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

const timestamps = {
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'string',
	})
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'string',
	})
		.notNull()
		.defaultNow()
		.$onUpdate(() => sql`now()`),
} as const;

// Better Auth core schema for email/password (see https://www.better-auth.com/docs/concepts/database)

export const userTable = pgTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	...timestamps,
});

export const sessionTable = pgTable('session', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	...timestamps,
});

export const accountTable = pgTable('account', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
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
	...timestamps,
});

export const verificationTable = pgTable('verification', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
	...timestamps,
});

export const authSchema = {
	user: userTable,
	session: sessionTable,
	account: accountTable,
	verification: verificationTable
};
