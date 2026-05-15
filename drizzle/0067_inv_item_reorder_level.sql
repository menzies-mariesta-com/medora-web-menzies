-- Low stock threshold per store+item (issue-unit quantity).
CREATE TABLE IF NOT EXISTS "inv_item_reorder_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "public"."hospital"("id") ON DELETE cascade,
	"store_id" integer NOT NULL REFERENCES "public"."store"("id") ON DELETE cascade,
	"item_id" integer NOT NULL REFERENCES "public"."item_master"("id") ON DELETE cascade,
	"min_qty" numeric(18, 0) NOT NULL DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
DROP INDEX IF EXISTS "inv_item_reorder_level_store_item_active_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_item_reorder_level_store_item_active_uidx"
	ON "inv_item_reorder_level" ("hospital_id", "store_id", "item_id")
	WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_item_reorder_level_store_idx"
	ON "inv_item_reorder_level" ("hospital_id", "store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_item_reorder_level_item_idx"
	ON "inv_item_reorder_level" ("hospital_id", "item_id");
