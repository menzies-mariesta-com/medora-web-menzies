-- Add created_by and updated_by to many-to-many junction tables (user action tracking, no soft delete)
ALTER TABLE "staff_department" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
