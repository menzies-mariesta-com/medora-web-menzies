import { relations } from 'drizzle-orm/relations';
import {
	staff,
	notification,
	hospital,
	patientVisit,
	referHistory,
	status,
	user
} from './schema';

export const notificationRelations = relations(
	notification,
	({ one }) => ({
		staff: one(staff, {
			fields: [notification.recipientStaffId],
			references: [staff.id]
		}),
		hospital: one(hospital, {
			fields: [notification.hospitalId],
			references: [hospital.id]
		}),
		patientVisit: one(patientVisit, {
			fields: [notification.visitId],
			references: [patientVisit.id]
		}),
		referHistory: one(referHistory, {
			fields: [notification.referHistoryId],
			references: [referHistory.id]
		}),
		status: one(status, {
			fields: [notification.statusId],
			references: [status.id]
		}),
		user_createdBy: one(user, {
			fields: [notification.createdBy],
			references: [user.id],
			relationName: 'notification_createdBy_user_id'
		}),
		user_updatedBy: one(user, {
			fields: [notification.updatedBy],
			references: [user.id],
			relationName: 'notification_updatedBy_user_id'
		}),
		user_deletedBy: one(user, {
			fields: [notification.deletedBy],
			references: [user.id],
			relationName: 'notification_deletedBy_user_id'
		})
	})
);

export const staffRelations = relations(staff, ({ many }) => ({
	notifications: many(notification)
}));

export const hospitalRelations = relations(hospital, ({ many }) => ({
	notifications: many(notification)
}));

export const patientVisitRelations = relations(
	patientVisit,
	({ many }) => ({
		notifications: many(notification)
	})
);

export const referHistoryRelations = relations(
	referHistory,
	({ many }) => ({
		notifications: many(notification)
	})
);

export const statusRelations = relations(status, ({ many }) => ({
	notifications: many(notification)
}));

export const userRelations = relations(user, ({ many }) => ({
	notifications_createdBy: many(notification, {
		relationName: 'notification_createdBy_user_id'
	}),
	notifications_updatedBy: many(notification, {
		relationName: 'notification_updatedBy_user_id'
	}),
	notifications_deletedBy: many(notification, {
		relationName: 'notification_deletedBy_user_id'
	})
}));
