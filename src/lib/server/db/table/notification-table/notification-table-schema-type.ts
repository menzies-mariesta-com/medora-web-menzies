import type {
	InferInsertModel,
	InferSelectModel as DrizzleInferSelectModel,
	Table
} from 'drizzle-orm';

import type { notificationTable } from './notification-table';

type OptionalAuditKeys =
	| 'createdBy'
	| 'updatedBy'
	| 'deletedBy'
	| 'deletedAt';

type WithOptionalAudit<T> = Omit<
	T,
	Extract<keyof T, OptionalAuditKeys>
> &
	Partial<Pick<T, Extract<keyof T, OptionalAuditKeys>>>;

type InferSelectModel<TTable extends Table> = WithOptionalAudit<
	DrizzleInferSelectModel<TTable>
>;

// Notification (persisted + read/unread tracking)
export type NotificationSchema = InferSelectModel<
	typeof notificationTable
>;
export type NotificationSchemaInsert = InferInsertModel<
	typeof notificationTable
>;
export type NotificationSchemaUpdate =
	Partial<NotificationSchemaInsert>;
