import { sql } from 'drizzle-orm';
import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { uuidV7 } from '../../../../util/id.util';
import { userTable } from '../auth-table/auth-table';

const planTimestamps = {
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

export const trialOtpTable = pgTable(
	'trial_otp',
	{
		email: varchar('email', { length: 256 }).primaryKey(),
		code: varchar('code', { length: 16 }).notNull(),
		expiresAt: timestamp('expires_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		createdAt: timestamp('created_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow()
	},
	(t) => [index('trial_otp_expires_at_idx').on(t.expiresAt)]
);

export const planRequestTable = pgTable(
	'plan_request',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		requestKind: varchar('request_kind', { length: 16 }).notNull(),
		pricingTier: varchar('pricing_tier', { length: 32 }),
		trialDuration: varchar('trial_duration', { length: 8 }),
		firstName: varchar('first_name', { length: 128 }).notNull(),
		lastName: varchar('last_name', { length: 128 }).notNull(),
		hospitalName: varchar('hospital_name', { length: 512 }).notNull(),
		website: varchar('website', { length: 512 }),
		email: varchar('email', { length: 256 }).notNull(),
		message: text('message'),
		status: varchar('status', { length: 16 }).notNull().default('pending'),
		resolvedAt: timestamp('resolved_at', {
			withTimezone: true,
			mode: 'string'
		}),
		resolvedByUserId: text('resolved_by_user_id').references(
			() => userTable.id,
			{ onDelete: 'set null', onUpdate: 'cascade' }
		),
		...planTimestamps
	},
	(t) => [
		index('plan_request_status_idx').on(t.status),
		index('plan_request_email_idx').on(t.email),
		index('plan_request_created_at_idx').on(t.createdAt)
	]
);

export const ownerEntitlementTable = pgTable(
	'owner_entitlement',
	{
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => uuidV7()),
		ownerId: text('owner_id')
			.notNull()
			.references(() => userTable.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade'
			}),
		pricingTier: varchar('pricing_tier', { length: 32 }).notNull(),
		billingMode: varchar('billing_mode', { length: 16 }).notNull(),
		trialDuration: varchar('trial_duration', { length: 8 }),
		startedAt: timestamp('started_at', {
			withTimezone: true,
			mode: 'string'
		}).notNull(),
		renewAt: timestamp('renew_at', {
			withTimezone: true,
			mode: 'string'
		}),
		endsAt: timestamp('ends_at', {
			withTimezone: true,
			mode: 'string'
		}),
		status: varchar('status', { length: 16 }).notNull().default('active'),
		sourcePlanRequestId: uuid('source_plan_request_id').references(
			() => planRequestTable.id,
			{ onDelete: 'set null', onUpdate: 'cascade' }
		),
		createdBy: text('created_by').references(() => userTable.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		updatedBy: text('updated_by').references(() => userTable.id, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		...planTimestamps
	},
	(t) => [
		index('owner_entitlement_owner_id_idx').on(t.ownerId),
		index('owner_entitlement_status_idx').on(t.status)
	]
);
