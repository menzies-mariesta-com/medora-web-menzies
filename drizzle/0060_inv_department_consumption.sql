-- Department consumption: tables + status tagging type 10 + approval module DC.

INSERT INTO "status_tagging_type" ("id", "name")
VALUES (10, 'Department consumption')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES
	(50, 'Draft', 'draft', 1, 10),
	(51, 'Pending', 'pending', 2, 10),
	(52, 'Posted', 'posted', 3, 10),
	(53, 'Cancelled', 'cancelled', 4, 10)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inv_department_consumption" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE cascade,
	"consumption_no" varchar(128),
	"store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE restrict,
	"requested_by" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
	"status_tagging_id" integer NOT NULL REFERENCES "status_tagging"("id") ON DELETE restrict,
	"current_level" integer NOT NULL DEFAULT 1,
	"remarks" text,
	"approved_by" text REFERENCES "user"("id") ON DELETE set null,
	"approved_at" timestamp with time zone,
	"cancelled_by" text REFERENCES "user"("id") ON DELETE set null,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "user"("id") ON DELETE set null,
	"updated_by" text REFERENCES "user"("id") ON DELETE set null,
	"deleted_by" text REFERENCES "user"("id") ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inv_department_consumption_hospital_store_idx"
	ON "inv_department_consumption" ("hospital_id", "store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_consumption_status_idx"
	ON "inv_department_consumption" ("status_tagging_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inv_department_consumption_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumption_id" uuid NOT NULL REFERENCES "inv_department_consumption"("id") ON DELETE cascade,
	"item_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE restrict,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL REFERENCES "unit"("id") ON DELETE restrict,
	"batch_id" integer NOT NULL REFERENCES "item_batch"("id") ON DELETE restrict,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inv_department_consumption_line_consumption_id_idx"
	ON "inv_department_consumption_line" ("consumption_id");
--> statement-breakpoint

ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'SI', 'SR', 'GRN', 'DC'));
--> statement-breakpoint

ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
--> statement-breakpoint
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'SI', 'SR', 'GRN', 'DC'));
