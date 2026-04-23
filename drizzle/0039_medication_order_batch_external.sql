ALTER TABLE "medication_order_batch" ADD COLUMN IF NOT EXISTS "ext_customer_name" varchar(512);
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD COLUMN IF NOT EXISTS "advising_doctor" varchar(512);
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ALTER COLUMN "visit_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_visit_mode_chk" CHECK ((
	("visit_id" IS NOT NULL AND "ext_customer_name" IS NULL AND "advising_doctor" IS NULL)
	OR (
		"visit_id" IS NULL
		AND "ext_customer_name" IS NOT NULL
		AND btrim("ext_customer_name") <> ''
		AND "advising_doctor" IS NOT NULL
		AND btrim("advising_doctor") <> ''
	)
));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_order_batch_hospital_ext_idx" ON "medication_order_batch" ("hospital_id") WHERE "visit_id" IS NULL;
