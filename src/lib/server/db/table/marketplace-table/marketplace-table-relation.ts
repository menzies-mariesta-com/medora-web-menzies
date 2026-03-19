import { relations } from 'drizzle-orm';
import {
	marketplaceAllowedFileExtensionTable,
	marketplaceAppArchiveTable,
	marketplaceAppFormTable,
	marketplaceAppTable
} from './marketplace-table';
import { statusTable } from '../master-table/master-table';

export const marketplaceAppTableRelations = relations(
	marketplaceAppTable,
	({ one, many }) => ({
		status: one(statusTable, {
			fields: [marketplaceAppTable.statusId],
			references: [statusTable.id]
		}),
		forms: many(marketplaceAppFormTable),
		archives: many(marketplaceAppArchiveTable)
	})
);

export const marketplaceAppFormTableRelations = relations(
	marketplaceAppFormTable,
	({ one }) => ({
		app: one(marketplaceAppTable, {
			fields: [marketplaceAppFormTable.appId],
			references: [marketplaceAppTable.id]
		}),
		status: one(statusTable, {
			fields: [marketplaceAppFormTable.statusId],
			references: [statusTable.id]
		})
	})
);

export const marketplaceAllowedFileExtensionTableRelations =
	relations(
		marketplaceAllowedFileExtensionTable,
		({ one, many }) => ({
			status: one(statusTable, {
				fields: [marketplaceAllowedFileExtensionTable.statusId],
				references: [statusTable.id]
			}),
			archives: many(marketplaceAppArchiveTable)
		})
	);

export const marketplaceAppArchiveTableRelations = relations(
	marketplaceAppArchiveTable,
	({ one }) => ({
		app: one(marketplaceAppTable, {
			fields: [marketplaceAppArchiveTable.appId],
			references: [marketplaceAppTable.id]
		}),
		fileExtension: one(marketplaceAllowedFileExtensionTable, {
			fields: [marketplaceAppArchiveTable.fileExtensionId],
			references: [marketplaceAllowedFileExtensionTable.id]
		}),
		status: one(statusTable, {
			fields: [marketplaceAppArchiveTable.statusId],
			references: [statusTable.id]
		})
	})
);
