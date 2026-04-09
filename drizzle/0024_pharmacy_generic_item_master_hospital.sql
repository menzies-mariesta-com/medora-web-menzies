CREATE TABLE "pharmacy_generic" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "pharmacy_generic_hospital_id_idx" ON "pharmacy_generic" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "pharmacy_generic_name_idx" ON "pharmacy_generic" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "pharmacy_generic_status_id_idx" ON "pharmacy_generic" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "item_master" ADD COLUMN "hospital_id" uuid;
--> statement-breakpoint
ALTER TABLE "item_master" ADD COLUMN "pharmacy_generic_id" integer;
--> statement-breakpoint
UPDATE "item_master" SET "hospital_id" = (SELECT "id" FROM "hospital" ORDER BY "id" ASC LIMIT 1) WHERE "hospital_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "item_master" ALTER COLUMN "hospital_id" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "item_master_barcode_unique";
--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_pharmacy_generic_id_pharmacy_generic_id_fk" FOREIGN KEY ("pharmacy_generic_id") REFERENCES "public"."pharmacy_generic"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "item_master_hospital_id_idx" ON "item_master" USING btree ("hospital_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "item_master_hospital_barcode_unique" ON "item_master" ("hospital_id", "barcode") WHERE "barcode" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_pharmacy_supply_generic_chk" CHECK (("category_id" <> 12) OR ("pharmacy_generic_id" IS NOT NULL)) NOT VALID;
