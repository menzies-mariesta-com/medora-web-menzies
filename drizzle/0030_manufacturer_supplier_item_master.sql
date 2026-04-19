CREATE TABLE "manufacturer" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"address" text,
	"country_id" integer,
	"state_id" integer,
	"city_id" integer,
	"postal_code_id" integer,
	"phone" varchar(64),
	"phone_country_id" integer,
	"email" varchar(256),
	"remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"address" text,
	"country_id" integer,
	"state_id" integer,
	"city_id" integer,
	"postal_code_id" integer,
	"phone" varchar(64),
	"phone_country_id" integer,
	"email" varchar(256),
	"remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "manufacturer_hospital_id_idx" ON "manufacturer" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "manufacturer_name_idx" ON "manufacturer" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "manufacturer_status_id_idx" ON "manufacturer" USING btree ("status_id");
--> statement-breakpoint
CREATE INDEX "supplier_hospital_id_idx" ON "supplier" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "supplier_name_idx" ON "supplier" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "supplier_status_id_idx" ON "supplier" USING btree ("status_id");
--> statement-breakpoint
ALTER TABLE "item_master" ADD COLUMN "manufacturer_id" integer;
--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_manufacturer_id_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturer"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "item_master_manufacturer_id_idx" ON "item_master" USING btree ("manufacturer_id");
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no", "created_at", "updated_at")
VALUES
	(25, 'Manufacture Setup', 9, 1, 22, '/heka/home/inventory-setup/manufacture-setup', 6, now(), now()),
	(26, 'Supplier Setup', 9, 1, 22, '/heka/home/inventory-setup/supplier-setup', 7, now(), now())
ON CONFLICT ("id") DO NOTHING;
