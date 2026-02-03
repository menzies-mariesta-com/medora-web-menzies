import { relations } from 'drizzle-orm';
import {
  accountTable,
  sessionTable,
  userTable,
  verificationTable
} from './auth-table';
import { staffTable } from '../information-table/information-table';

// Auth table relations

export const userTableRollbackRelations = relations(userTable, ({ one, many }) => ({
  sessions: many(sessionTable),
  accounts: many(accountTable),
  // 1:1 link to staff profile via staff.userId
  staff: one(staffTable, {
    fields: [userTable.id],
    references: [staffTable.userId]
  })
}));

export const sessionTableRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id]
  })
}));

export const accountTableRelations = relations(accountTable, ({ one }) => ({
  user: one(userTable, {
    fields: [accountTable.userId],
    references: [userTable.id]
  })
}));

export const verificationTableRelations = relations(verificationTable, () => ({}));