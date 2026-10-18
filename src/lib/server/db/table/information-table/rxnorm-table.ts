import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
const rxTimestamps = {
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

export const rxnormReleaseTable = pgTable(
	'rxnorm_release',
	{
		id: serial('id').primaryKey(),
		releaseId: varchar('release_id', { length: 128 }).notNull(),
		source: varchar('source', { length: 64 })
			.notNull()
			.default('NLM_RXNORM_FULL'),
		conceptCount: integer('concept_count').notNull().default(0),
		relCount: integer('rel_count').notNull().default(0),
		importedAt: timestamp('imported_at', {
			withTimezone: true,
			mode: 'string'
		})
			.notNull()
			.defaultNow(),
		notes: text('notes'),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('rxnorm_release_source_release_uidx').on(
			t.source,
			t.releaseId
		)
	]
);

export const rxnormConceptTable = pgTable(
	'rxnorm_concept',
	{
		rxcui: varchar('rxcui', { length: 16 }).primaryKey(),
		name: varchar('name', { length: 1024 }).notNull(),
		tty: varchar('tty', { length: 8 }).notNull(),
		suppress: varchar('suppress', { length: 8 }),
		normalizedName: varchar('normalized_name', { length: 1024 }),
		releaseId: varchar('release_id', { length: 128 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		index('rxnorm_concept_tty_idx').on(t.tty),
		index('rxnorm_concept_name_idx').on(t.normalizedName),
		index('rxnorm_concept_release_idx').on(t.releaseId)
	]
);

export const rxnormRelTable = pgTable(
	'rxnorm_rel',
	{
		id: serial('id').primaryKey(),
		rxcui1: varchar('rxcui1', { length: 16 }).notNull(),
		rxcui2: varchar('rxcui2', { length: 16 }).notNull(),
		rela: varchar('rela', { length: 64 }).notNull(),
		releaseId: varchar('release_id', { length: 128 }).notNull()
	},
	(t) => [
		index('rxnorm_rel_rxcui1_idx').on(t.rxcui1),
		index('rxnorm_rel_rxcui2_idx').on(t.rxcui2),
		index('rxnorm_rel_rela_idx').on(t.rela),
		uniqueIndex('rxnorm_rel_pair_rela_release_uidx').on(
			t.rxcui1,
			t.rxcui2,
			t.rela,
			t.releaseId
		)
	]
);

export const rxnormNdcTable = pgTable(
	'rxnorm_ndc',
	{
		id: serial('id').primaryKey(),
		rxcui: varchar('rxcui', { length: 16 }).notNull(),
		ndc: varchar('ndc', { length: 32 }).notNull(),
		releaseId: varchar('release_id', { length: 128 }).notNull()
	},
	(t) => [
		uniqueIndex('rxnorm_ndc_ndc_release_uidx').on(t.ndc, t.releaseId),
		index('rxnorm_ndc_rxcui_idx').on(t.rxcui)
	]
);

export const drugInteractionTable = pgTable(
	'drug_interaction',
	{
		id: serial('id').primaryKey(),
		source: varchar('source', { length: 32 }).notNull(),
		externalId: varchar('external_id', { length: 128 }).notNull(),
		rxcuiA: varchar('rxcui_a', { length: 16 }),
		rxcuiB: varchar('rxcui_b', { length: 16 }),
		ingredientRxcuiA: varchar('ingredient_rxcui_a', { length: 16 }),
		ingredientRxcuiB: varchar('ingredient_rxcui_b', { length: 16 }),
		severity: varchar('severity', { length: 16 }).notNull(),
		description: text('description').notNull(),
		management: text('management'),
		releaseOrVersion: varchar('release_or_version', { length: 128 }),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('drug_interaction_source_external_uidx').on(
			t.source,
			t.externalId
		),
		index('drug_interaction_rxcui_a_idx').on(t.rxcuiA),
		index('drug_interaction_rxcui_b_idx').on(t.rxcuiB),
		index('drug_interaction_ing_a_idx').on(t.ingredientRxcuiA),
		index('drug_interaction_ing_b_idx').on(t.ingredientRxcuiB)
	]
);

export const allergyRxnormMapTable = pgTable(
	'allergy_rxnorm_map',
	{
		id: serial('id').primaryKey(),
		allergyId: integer('allergy_id').notNull(),
		ingredientRxcui: varchar('ingredient_rxcui', { length: 16 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('allergy_rxnorm_map_allergy_uidx').on(t.allergyId)
	]
);

export const ddinterRxnormMapTable = pgTable(
	'ddinter_rxnorm_map',
	{
		id: serial('id').primaryKey(),
		ddinterDrugKey: varchar('ddinter_drug_key', { length: 512 }).notNull(),
		rxcui: varchar('rxcui', { length: 16 }).notNull(),
		...rxTimestamps
	},
	(t) => [
		uniqueIndex('ddinter_rxnorm_map_key_uidx').on(t.ddinterDrugKey)
	]
);
