/**
 * Referral notification `event_type` values (persisted on `notification` table).
 */
export const ReferNotificationEventType = {
	CREATED: 'REFER_CREATED',
	ACCEPTED: 'REFER_ACCEPTED',
	REJECTED: 'REFER_REJECTED',
	CANCELED: 'REFER_CANCELED'
} as const;

export type ReferNotificationEventTypeValue =
	(typeof ReferNotificationEventType)[keyof typeof ReferNotificationEventType];
