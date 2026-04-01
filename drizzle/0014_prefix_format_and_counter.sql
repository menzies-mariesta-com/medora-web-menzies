CREATE TABLE IF NOT EXISTS "prefix_format" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"key" varchar(128) NOT NULL,
	"description" text,
	"format" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "prefix_format_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "prefix_format_hospital_key_unique" UNIQUE ("hospital_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prefix_counter" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid,
	"financial_year_id" integer,
	"visit_type_id" integer,
	"key" varchar(128) NOT NULL,
	"scope_key" text NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prefix_counter_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "prefix_counter_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "prefix_counter_financial_year_id_financial_year_id_fk" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_year"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "prefix_counter_visit_type_id_visit_type_id_fk" FOREIGN KEY ("visit_type_id") REFERENCES "public"."visit_type"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "prefix_counter_scope_key_unique" UNIQUE ("scope_key")
);
--> statement-breakpoint
INSERT INTO "prefix_format" (
	"hospital_id",
	"key",
	"description",
	"format",
	"created_at",
	"updated_at",
	"deleted_at",
	"created_by",
	"updated_by",
	"deleted_by"
)
SELECT DISTINCT ON ("hospital_id", "key")
	"hospital_id",
	"key",
	"description",
	"format",
	"created_at",
	"updated_at",
	"deleted_at",
	"created_by",
	"updated_by",
	"deleted_by"
FROM "prefix_configuration"
WHERE "deleted_at" IS NULL
ORDER BY "hospital_id", "key", "id" ASC;
--> statement-breakpoint
UPDATE "prefix_format"
SET "format" = replace("format"::text, 'prefix_configuration.last_no', 'prefix_counter.last_no')::jsonb;
--> statement-breakpoint
INSERT INTO "prefix_counter" (
	"hospital_id",
	"branch_id",
	"financial_year_id",
	"visit_type_id",
	"key",
	"scope_key",
	"last_no",
	"created_at",
	"updated_at"
)
SELECT
	"hospital_id",
	"branch_id",
	"financial_year_id",
	NULL,
	"key",
	"hospital_id"::text
		|| '|'
		|| COALESCE("branch_id"::text, '')
		|| '|'
		|| COALESCE("financial_year_id"::text, '')
		|| '|'
		|| "key"
		|| '|'
		|| '',
	"last_no",
	"created_at",
	"updated_at"
FROM "prefix_configuration"
WHERE "deleted_at" IS NULL;
--> statement-breakpoint
DROP TABLE "prefix_configuration";
