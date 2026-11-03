-- Align hospital_billing_setting with Drizzle timestamps (audit columns).

ALTER TABLE "hospital_billing_setting" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "hospital_billing_setting" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "hospital_billing_setting" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "hospital_billing_setting" ADD COLUMN IF NOT EXISTS "deleted_by" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "hospital_billing_setting" ADD CONSTRAINT "hospital_billing_setting_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "hospital_billing_setting" ADD CONSTRAINT "hospital_billing_setting_updated_by_user_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "hospital_billing_setting" ADD CONSTRAINT "hospital_billing_setting_deleted_by_user_id_fk"
		FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
