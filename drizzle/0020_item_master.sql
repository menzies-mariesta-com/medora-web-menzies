-- Item Master supply categories (fixed ids 11–13; enforced on item_master.category_id).
INSERT INTO "category" ("id", "category_name", "status_id")
VALUES
	(11, 'General Supply', 1),
	(12, 'Pharmacy Supply', 1),
	(13, 'Medical Supply', 1)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
CREATE TABLE "item_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_name" varchar(512) NOT NULL,
	"category_id" integer NOT NULL,
	"item_code" varchar(128),
	"unit_id" integer,
	"description" text,
	"remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "item_master_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "item_master_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "item_master_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "item_master_category_supply_chk" CHECK (("category_id" IN (11, 12, 13))),
	CONSTRAINT "item_master_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "item_master_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "item_master_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);--> statement-breakpoint
CREATE INDEX "item_master_category_id_idx" ON "item_master" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "item_master_item_name_idx" ON "item_master" USING btree ("item_name");--> statement-breakpoint
CREATE INDEX "item_master_status_id_idx" ON "item_master" USING btree ("status_id");
