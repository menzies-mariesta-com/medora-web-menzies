-- Add audit user columns omitted from 0013 (schema uses ...timestamps)
--> statement-breakpoint
ALTER TABLE "ipd_admission_order" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "ipd_admission_order" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "ipd_admission_order" ADD COLUMN IF NOT EXISTS "deleted_by" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_updated_by_user_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_deleted_by_user_id_fk"
		FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "ip_advance_deposit" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "ip_advance_deposit" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "ip_advance_deposit" ADD COLUMN IF NOT EXISTS "deleted_by" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_updated_by_user_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_deleted_by_user_id_fk"
		FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
