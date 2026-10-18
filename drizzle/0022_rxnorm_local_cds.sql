ALTER TABLE "item_master" ADD COLUMN IF NOT EXISTS "rxnorm_rxcui" varchar(16);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_master_rxnorm_rxcui_idx" ON "item_master" ("rxnorm_rxcui");--> statement-breakpoint
ALTER TABLE "prescribing_alert" ADD COLUMN IF NOT EXISTS "concept_ref" varchar(64);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rxnorm_release" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" varchar(128) NOT NULL,
	"source" varchar(64) DEFAULT 'NLM_RXNORM_FULL' NOT NULL,
	"concept_count" integer DEFAULT 0 NOT NULL,
	"rel_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rxnorm_release_source_release_uidx" ON "rxnorm_release" ("source","release_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rxnorm_concept" (
	"rxcui" varchar(16) PRIMARY KEY NOT NULL,
	"name" varchar(1024) NOT NULL,
	"tty" varchar(8) NOT NULL,
	"suppress" varchar(8),
	"normalized_name" varchar(1024),
	"release_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_concept_tty_idx" ON "rxnorm_concept" ("tty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_concept_name_idx" ON "rxnorm_concept" ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_concept_release_idx" ON "rxnorm_concept" ("release_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_concept_prescribe_tty_idx" ON "rxnorm_concept" ("tty") WHERE "tty" IN ('SCD','GP','BN','IN','PIN','SCDF');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rxnorm_rel" (
	"id" serial PRIMARY KEY NOT NULL,
	"rxcui1" varchar(16) NOT NULL,
	"rxcui2" varchar(16) NOT NULL,
	"rela" varchar(64) NOT NULL,
	"release_id" varchar(128) NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_rel_rxcui1_idx" ON "rxnorm_rel" ("rxcui1");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_rel_rxcui2_idx" ON "rxnorm_rel" ("rxcui2");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_rel_rela_idx" ON "rxnorm_rel" ("rela");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rxnorm_rel_pair_rela_release_uidx" ON "rxnorm_rel" ("rxcui1","rxcui2","rela","release_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rxnorm_ndc" (
	"id" serial PRIMARY KEY NOT NULL,
	"rxcui" varchar(16) NOT NULL,
	"ndc" varchar(32) NOT NULL,
	"release_id" varchar(128) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rxnorm_ndc_ndc_release_uidx" ON "rxnorm_ndc" ("ndc","release_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rxnorm_ndc_rxcui_idx" ON "rxnorm_ndc" ("rxcui");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drug_interaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(32) NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"rxcui_a" varchar(16),
	"rxcui_b" varchar(16),
	"ingredient_rxcui_a" varchar(16),
	"ingredient_rxcui_b" varchar(16),
	"severity" varchar(16) NOT NULL,
	"description" text NOT NULL,
	"management" text,
	"release_or_version" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drug_interaction_source_external_uidx" ON "drug_interaction" ("source","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_interaction_rxcui_a_idx" ON "drug_interaction" ("rxcui_a");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_interaction_rxcui_b_idx" ON "drug_interaction" ("rxcui_b");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_interaction_ing_a_idx" ON "drug_interaction" ("ingredient_rxcui_a");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_interaction_ing_b_idx" ON "drug_interaction" ("ingredient_rxcui_b");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "allergy_rxnorm_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"allergy_id" integer NOT NULL,
	"ingredient_rxcui" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "allergy_rxnorm_map_allergy_uidx" ON "allergy_rxnorm_map" ("allergy_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ddinter_rxnorm_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"ddinter_drug_key" varchar(512) NOT NULL,
	"rxcui" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ddinter_rxnorm_map_key_uidx" ON "ddinter_rxnorm_map" ("ddinter_drug_key");
