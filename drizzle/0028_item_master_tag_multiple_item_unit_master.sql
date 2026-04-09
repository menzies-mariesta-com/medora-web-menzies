-- Item Master: tag multiple unit conversions (Item Unit Master)

CREATE TABLE IF NOT EXISTS "item_master_item_unit_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_master_id" integer NOT NULL,
	"item_unit_master_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "im_ium_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "im_ium_item_master_id_fk" FOREIGN KEY ("item_master_id") REFERENCES "public"."item_master"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "im_ium_item_unit_master_id_fk" FOREIGN KEY ("item_unit_master_id") REFERENCES "public"."item_unit_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "im_ium_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "im_ium_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "im_ium_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "im_ium_hospital_id_idx" ON "item_master_item_unit_master" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "im_ium_item_master_id_idx" ON "item_master_item_unit_master" USING btree ("item_master_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "im_ium_item_unit_master_id_idx" ON "item_master_item_unit_master" USING btree ("item_unit_master_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "im_ium_hospital_item_unit_unique"
	ON "item_master_item_unit_master" ("hospital_id", "item_master_id", "item_unit_master_id")
	WHERE "deleted_at" IS NULL;

