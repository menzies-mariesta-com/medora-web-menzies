import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
	userTable,
	sessionTable,
	accountTable,
	verificationTable,
	roleTable
} from './auth-table';

// Auth tables

export type UserSchema = InferSelectModel<typeof userTable>;
export type UserSchemaInsert = InferInsertModel<typeof userTable>;
export type UserSchemaUpdate = Partial<UserSchemaInsert>;

export type SessionSchema = InferSelectModel<typeof sessionTable>;
export type SessionSchemaInsert = InferInsertModel<
	typeof sessionTable
>;
export type SessionSchemaUpdate = Partial<SessionSchemaInsert>;

export type AccountSchema = InferSelectModel<typeof accountTable>;
export type AccountSchemaInsert = InferInsertModel<
	typeof accountTable
>;
export type AccountSchemaUpdate = Partial<AccountSchemaInsert>;

export type VerificationSchema = InferSelectModel<
	typeof verificationTable
>;
export type VerificationSchemaInsert = InferInsertModel<
	typeof verificationTable
>;
export type VerificationSchemaUpdate =
	Partial<VerificationSchemaInsert>;

export type RoleSchema = InferSelectModel<typeof roleTable>;
export type RoleSchemaInsert = InferInsertModel<typeof roleTable>;
export type RoleSchemaUpdate = Partial<RoleSchemaInsert>;
