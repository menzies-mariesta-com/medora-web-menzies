import type {
	marketplaceAllowedFileExtensionTable,
	marketplaceAppArchiveTable,
	marketplaceAppFormTable,
	marketplaceAppTable
} from './marketplace-table';

export type MarketplaceAppSchema =
	typeof marketplaceAppTable.$inferSelect;
export type MarketplaceAppSchemaInsert =
	typeof marketplaceAppTable.$inferInsert;
export type MarketplaceAppSchemaUpdate =
	Partial<MarketplaceAppSchemaInsert>;

export type MarketplaceAppFormSchema =
	typeof marketplaceAppFormTable.$inferSelect;
export type MarketplaceAppFormSchemaInsert =
	typeof marketplaceAppFormTable.$inferInsert;
export type MarketplaceAppFormSchemaUpdate =
	Partial<MarketplaceAppFormSchemaInsert>;

export type MarketplaceAllowedFileExtensionSchema =
	typeof marketplaceAllowedFileExtensionTable.$inferSelect;
export type MarketplaceAllowedFileExtensionSchemaInsert =
	typeof marketplaceAllowedFileExtensionTable.$inferInsert;
export type MarketplaceAllowedFileExtensionSchemaUpdate =
	Partial<MarketplaceAllowedFileExtensionSchemaInsert>;

export type MarketplaceAppArchiveSchema =
	typeof marketplaceAppArchiveTable.$inferSelect;
export type MarketplaceAppArchiveSchemaInsert =
	typeof marketplaceAppArchiveTable.$inferInsert;
export type MarketplaceAppArchiveSchemaUpdate =
	Partial<MarketplaceAppArchiveSchemaInsert>;
