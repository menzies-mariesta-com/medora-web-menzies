-- Remove duplicate staff_user_group rows (keep one per staff_id + user_group_id)
DELETE FROM staff_user_group a
USING staff_user_group b
WHERE a.id > b.id
  AND a.staff_id = b.staff_id
  AND a.user_group_id = b.user_group_id;
--> statement-breakpoint

-- Remove duplicate staff_branch rows (keep one per staff_id + branch_id)
DELETE FROM staff_branch a
USING staff_branch b
WHERE a.id > b.id
  AND a.staff_id = b.staff_id
  AND a.branch_id = b.branch_id;
--> statement-breakpoint

-- Add unique constraint to prevent future duplicates
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_staff_id_user_group_id_unique" UNIQUE ("staff_id", "user_group_id");
--> statement-breakpoint

ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_staff_id_branch_id_unique" UNIQUE ("staff_id", "branch_id");
