import { relations } from 'drizzle-orm';
import {
	accountTable,
	roleTable,
	sessionTable,
	userTable,
	verificationTable
} from './auth-table';
import {
	staffTable,
	supportTicketTable
} from '../information-table/information-table';
import { statusTable } from '../master-table/master-table';

// Auth table relations

export const userTableRollbackRelations = relations(
	userTable,
	({ one, many }) => ({
		sessions: many(sessionTable),
		accounts: many(accountTable),
		// 1:1 link to staff profile via staff.userId
		staff: one(staffTable, {
			fields: [userTable.id],
			references: [staffTable.userId]
		}),
		role: one(roleTable, {
			fields: [userTable.roleId],
			references: [roleTable.id]
		}),
		supportTicketsRequested: many(supportTicketTable, {
			relationName: 'support_ticket_requester'
		}),
		supportTicketsAssigned: many(supportTicketTable, {
			relationName: 'support_ticket_assignee'
		}),
		supportTicketsCreatedAudit: many(supportTicketTable, {
			relationName: 'support_ticket_created_by'
		}),
		supportTicketsUpdatedAudit: many(supportTicketTable, {
			relationName: 'support_ticket_updated_by'
		})
	})
);

export const sessionTableRelations = relations(
	sessionTable,
	({ one }) => ({
		user: one(userTable, {
			fields: [sessionTable.userId],
			references: [userTable.id]
		})
	})
);

export const accountTableRelations = relations(
	accountTable,
	({ one }) => ({
		user: one(userTable, {
			fields: [accountTable.userId],
			references: [userTable.id]
		})
	})
);

export const verificationTableRelations = relations(
	verificationTable,
	() => ({})
);

export const roleTableRelations = relations(
	roleTable,
	({ one, many }) => ({
		status: one(statusTable, {
			fields: [roleTable.statusId],
			references: [statusTable.id]
		}),
		users: many(userTable)
	})
);
