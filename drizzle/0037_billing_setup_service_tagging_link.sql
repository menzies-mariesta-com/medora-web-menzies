-- Billing setup links to existing service_tagging rows (OP / IP / ER), not duplicate taggings.

DROP INDEX IF EXISTS "service_tagging_branch_billing_type_idx";
ALTER TABLE "service_tagging" DROP COLUMN IF EXISTS "billing_type";

CREATE TABLE IF NOT EXISTS "billing_setup_service_tagging" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"care_setting" varchar(8) NOT NULL,
	"service_tagging_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);

ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_service_tagging_id_service_tagging_id_fk" FOREIGN KEY ("service_tagging_id") REFERENCES "public"."service_tagging"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "billing_setup_service_tagging" ADD CONSTRAINT "billing_setup_service_tagging_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;

CREATE UNIQUE INDEX IF NOT EXISTS "billing_setup_hospital_care_tagging_uidx" ON "billing_setup_service_tagging" ("hospital_id","care_setting","service_tagging_id");
CREATE INDEX IF NOT EXISTS "billing_setup_hospital_care_idx" ON "billing_setup_service_tagging" ("hospital_id","care_setting");
