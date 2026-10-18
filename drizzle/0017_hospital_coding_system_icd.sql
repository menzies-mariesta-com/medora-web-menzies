-- Hospital binds one WHO coding standard (ICD10 | ICD11). Catalog stays global.
ALTER TABLE "hospital"
ADD COLUMN IF NOT EXISTS "coding_system" varchar(32) DEFAULT 'ICD10' NOT NULL;
--> statement-breakpoint
ALTER TABLE "diagnosis_code"
ADD COLUMN IF NOT EXISTS "release_id" varchar(128);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_code_system_status_idx"
ON "diagnosis_code" ("system", "status_id");
--> statement-breakpoint
-- Faster code/description search once WHO catalogs are imported.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_code_code_trgm_idx"
ON "diagnosis_code" USING gin ("code" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_code_description_trgm_idx"
ON "diagnosis_code" USING gin ("description" gin_trgm_ops);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diagnosis_code_release" (
	"id" serial PRIMARY KEY NOT NULL,
	"system" varchar(32) NOT NULL,
	"release_id" varchar(128) NOT NULL,
	"source" varchar(64) DEFAULT 'WHO_ICD_API' NOT NULL,
	"title_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "diagnosis_code_release_system_release_uidx"
ON "diagnosis_code_release" ("system", "release_id");
