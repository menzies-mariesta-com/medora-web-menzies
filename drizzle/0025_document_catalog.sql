-- Document template catalog and hospital binding

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "catalog_code" varchar(128);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "is_system_catalog" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "hospital_id" uuid REFERENCES "hospital"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_catalog_code_idx" ON "document" ("catalog_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_hospital_id_idx" ON "document" ("hospital_id");
--> statement-breakpoint
INSERT INTO document_type (id, document_type, status_id)
VALUES
	(6, 'Letter', 1),
	(7, 'Report', 1),
	(8, 'Finance', 1),
	(9, 'HR', 1),
	(10, 'Legal', 1)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_document_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"default_catalog_locale" varchar(16) DEFAULT 'en' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_document_setting_hospital_uidx" ON "hospital_document_setting" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_catalog" (
	"catalog_code" varchar(128) PRIMARY KEY NOT NULL,
	"kind" varchar(32) DEFAULT 'html_print' NOT NULL,
	"category" varchar(64) NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text,
	"tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"surfaces_json" jsonb DEFAULT '["emr_clinical"]'::jsonb NOT NULL,
	"document_type_id" integer NOT NULL REFERENCES "document_type"("id"),
	"system_document_id" integer REFERENCES "document"("id") ON DELETE SET NULL,
	"catalog_version" integer DEFAULT 1 NOT NULL,
	"default_document_setting_id" integer REFERENCES "document_setting"("id"),
	"locale_document_ids_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_catalog_category_idx" ON "document_catalog" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_catalog_kind_idx" ON "document_catalog" ("kind");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_document_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"catalog_code" varchar(128) NOT NULL REFERENCES "document_catalog"("catalog_code") ON DELETE CASCADE,
	"locale" varchar(16) DEFAULT 'en' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"document_id" integer NOT NULL REFERENCES "document"("id") ON DELETE CASCADE,
	"document_setting_id" integer REFERENCES "document_setting"("id"),
	"forked_from_catalog_version" integer,
	"enabled_at" timestamp with time zone,
	"enabled_by" uuid REFERENCES "staff"("id"),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_document_template_hospital_catalog_uidx" ON "hospital_document_template" ("hospital_id", "catalog_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_document_template_hospital_enabled_idx" ON "hospital_document_template" ("hospital_id", "is_enabled");
