-- Department Issue: separate tables (header/lines/alloc) + status tagging type.

-- 1) status_tagging_type + status_tagging for Department issue
INSERT INTO "status_tagging_type" ("id", "name")
VALUES (9, 'Department issue')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- ids 46–50 reserved for Department issue
INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES
	(46, 'Pending', 'pending', 1, 9),
	(47, 'Issued', 'issued', 2, 9),
	(48, 'Received', 'received', 3, 9),
	(49, 'Cancelled', 'cancelled', 4, 9)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- 2) inv_department_issue (central → requesting store), links to source indent
CREATE TABLE IF NOT EXISTS "inv_department_issue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE cascade,
	"issue_no" varchar(128),
	"source_indent_id" uuid REFERENCES "inv_department_indent"("id") ON DELETE set null,
	"from_store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE restrict,
	"to_store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE restrict,
	"requested_by" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
	"status_tagging_id" integer NOT NULL REFERENCES "status_tagging"("id") ON DELETE restrict,
	"current_level" integer NOT NULL DEFAULT 1,
	"remarks" text,
	"approved_by" text REFERENCES "user"("id") ON DELETE set null,
	"approved_at" timestamp with time zone,
	"issued_by" text REFERENCES "user"("id") ON DELETE set null,
	"issued_at" timestamp with time zone,
	"received_by" text REFERENCES "user"("id") ON DELETE set null,
	"received_at" timestamp with time zone,
	"cancelled_by" text REFERENCES "user"("id") ON DELETE set null,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "user"("id") ON DELETE set null,
	"updated_by" text REFERENCES "user"("id") ON DELETE set null,
	"deleted_by" text REFERENCES "user"("id") ON DELETE set null,
	CONSTRAINT "inv_department_issue_stores_distinct_chk" CHECK ("from_store_id" <> "to_store_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inv_department_issue_hospital_from_idx"
	ON "inv_department_issue" ("hospital_id", "from_store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_issue_hospital_to_idx"
	ON "inv_department_issue" ("hospital_id", "to_store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_issue_status_idx"
	ON "inv_department_issue" ("status_tagging_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_issue_source_indent_idx"
	ON "inv_department_issue" ("source_indent_id");
--> statement-breakpoint

-- 3) inv_department_issue_line
CREATE TABLE IF NOT EXISTS "inv_department_issue_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL REFERENCES "inv_department_issue"("id") ON DELETE cascade,
	"item_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE restrict,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL REFERENCES "unit"("id") ON DELETE restrict,
	"qty_issued" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_issue_line_issue_id_idx"
	ON "inv_department_issue_line" ("issue_id");
--> statement-breakpoint

-- 4) inv_department_issue_line_alloc (FEFO allocations at issue-time)
CREATE TABLE IF NOT EXISTS "inv_department_issue_line_alloc" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL REFERENCES "inv_department_issue_line"("id") ON DELETE cascade,
	"batch_id" integer NOT NULL REFERENCES "item_batch"("id") ON DELETE restrict,
	"quantity" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_issue_line_alloc_line_idx"
	ON "inv_department_issue_line_alloc" ("line_id");

