-- Store must be owned by exactly one of user_group or department (not both, not neither).
ALTER TABLE "store" ADD COLUMN "user_group_id" integer;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Legacy rows without an owner cannot satisfy the new rule; remove them before adding CHECK.
DELETE FROM "store" WHERE "user_group_id" IS NULL AND "department_id" IS NULL;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_user_group_xor_department_chk" CHECK (((("user_group_id" IS NOT NULL)::int) + (("department_id" IS NOT NULL)::int)) = 1);
