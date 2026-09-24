-- Ensure no null branch_id rows before NOT NULL (orphan wards from older optional FK).
DELETE FROM "bed" WHERE "ward_id" IN (SELECT "id" FROM "ward" WHERE "branch_id" IS NULL);
--> statement-breakpoint
DELETE FROM "ward" WHERE "branch_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "ward" DROP CONSTRAINT "ward_branch_id_hospital_branch_id_fk";
--> statement-breakpoint
ALTER TABLE "ward" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
