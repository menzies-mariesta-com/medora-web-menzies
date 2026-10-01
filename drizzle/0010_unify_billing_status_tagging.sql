-- Unify OP/IP billing status tagging into one Billing type (Open 56 / Closed 57).
--> statement-breakpoint
UPDATE "status_tagging_type" SET "name" = 'Billing' WHERE "id" = 11;
--> statement-breakpoint
UPDATE "ip_billing" SET "status_tagging_id" = 56 WHERE "status_tagging_id" = 58;
--> statement-breakpoint
UPDATE "ip_billing" SET "status_tagging_id" = 57 WHERE "status_tagging_id" = 59;
--> statement-breakpoint
UPDATE "op_billing" SET "status_tagging_id" = 56 WHERE "status_tagging_id" = 58;
--> statement-breakpoint
UPDATE "op_billing" SET "status_tagging_id" = 57 WHERE "status_tagging_id" = 59;
--> statement-breakpoint
ALTER TABLE "ip_billing" ALTER COLUMN "status_tagging_id" SET DEFAULT 56;
--> statement-breakpoint
DELETE FROM "status_tagging" WHERE "id" IN (58, 59);
--> statement-breakpoint
DELETE FROM "status_tagging_type" WHERE "id" = 12;
