-- OP / IP billing: close via status_tagging (Open / Closed) instead of printed_at
--> statement-breakpoint
INSERT INTO "status_tagging_type" ("id", "name")
VALUES
	(11, 'Billing')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES
	(56, 'Open', 'open', 1, 11),
	(57, 'Closed', 'closed', 2, 11)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "op_billing" ADD COLUMN IF NOT EXISTS "status_tagging_id" integer;
--> statement-breakpoint
ALTER TABLE "ip_billing" ADD COLUMN IF NOT EXISTS "status_tagging_id" integer;
--> statement-breakpoint
UPDATE "op_billing"
SET "status_tagging_id" = CASE
	WHEN "printed_at" IS NOT NULL THEN 57
	ELSE 56
END
WHERE "status_tagging_id" IS NULL;
--> statement-breakpoint
UPDATE "ip_billing"
SET "status_tagging_id" = CASE
	WHEN "printed_at" IS NOT NULL THEN 57
	ELSE 56
END
WHERE "status_tagging_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "op_billing" ALTER COLUMN "status_tagging_id" SET DEFAULT 56;
--> statement-breakpoint
ALTER TABLE "op_billing" ALTER COLUMN "status_tagging_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ip_billing" ALTER COLUMN "status_tagging_id" SET DEFAULT 56;
--> statement-breakpoint
ALTER TABLE "ip_billing" ALTER COLUMN "status_tagging_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_status_tagging_id_status_tagging_id_fk"
		FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_status_tagging_id_status_tagging_id_fk"
		FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_status_tagging_id_idx" ON "op_billing" USING btree ("status_tagging_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ip_billing_status_tagging_id_idx" ON "ip_billing" USING btree ("status_tagging_id");
