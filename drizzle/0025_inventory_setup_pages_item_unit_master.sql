-- Inventory Setup navigation parent + child URLs; item purchase/issue unit conversion per hospital item
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no", "created_at", "updated_at")
VALUES (22, 'Inventory Setup', 1, 1, NULL, '/heka/home/administration/inventory-setup', 11, now(), now())
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"module_id" = EXCLUDED."module_id",
	"status_id" = EXCLUDED."status_id",
	"parent_id" = NULL,
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no",
	"updated_at" = now();
--> statement-breakpoint
UPDATE "page" SET
	"parent_id" = 22,
	"page_url" = '/heka/home/administration/inventory-setup/stores',
	"sequence_no" = 1,
	"updated_at" = now()
WHERE "id" = 19;
--> statement-breakpoint
UPDATE "page" SET
	"parent_id" = 22,
	"page_url" = '/heka/home/administration/inventory-setup/item-master',
	"sequence_no" = 2,
	"updated_at" = now()
WHERE "id" = 20;
--> statement-breakpoint
UPDATE "page" SET
	"parent_id" = 22,
	"page_url" = '/heka/home/administration/inventory-setup/pharmacy-generic',
	"sequence_no" = 3,
	"updated_at" = now()
WHERE "id" = 21;
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no", "created_at", "updated_at")
VALUES
	(23, 'Unit Master', 1, 1, 22, '/heka/home/administration/inventory-setup/unit-master', 4, now(), now()),
	(24, 'Item Unit Master', 1, 1, 22, '/heka/home/administration/inventory-setup/item-unit-master', 5, now(), now())
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"module_id" = EXCLUDED."module_id",
	"status_id" = EXCLUDED."status_id",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no",
	"updated_at" = now();
--> statement-breakpoint
CREATE TABLE "item_unit_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_master_id" integer NOT NULL,
	"purchase_unit_id" integer NOT NULL,
	"purchase_conversion_factor" numeric(18, 6) NOT NULL,
	"issue_unit_id" integer NOT NULL,
	"issue_conversion_factor" numeric(18, 6) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "item_unit_master_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "item_unit_master_item_master_id_item_master_id_fk" FOREIGN KEY ("item_master_id") REFERENCES "public"."item_master"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "item_unit_master_purchase_unit_id_unit_id_fk" FOREIGN KEY ("purchase_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "item_unit_master_issue_unit_id_unit_id_fk" FOREIGN KEY ("issue_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "item_unit_master_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "item_unit_master_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "item_unit_master_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "item_unit_master_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "item_unit_master_factors_positive_chk" CHECK (("purchase_conversion_factor" > 0) AND ("issue_conversion_factor" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "item_unit_master_hospital_item_unique" ON "item_unit_master" ("hospital_id", "item_master_id") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "item_unit_master_hospital_id_idx" ON "item_unit_master" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "item_unit_master_item_master_id_idx" ON "item_unit_master" USING btree ("item_master_id");
--> statement-breakpoint
CREATE INDEX "item_unit_master_status_id_idx" ON "item_unit_master" USING btree ("status_id");
