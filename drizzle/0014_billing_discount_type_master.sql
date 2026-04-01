CREATE TABLE IF NOT EXISTS "billing_discount_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "billing_discount_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_discount_type_code_idx" ON "billing_discount_type" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_discount_type_name_idx" ON "billing_discount_type" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_discount_type_status_id_idx" ON "billing_discount_type" USING btree ("status_id");
--> statement-breakpoint
INSERT INTO "billing_discount_type" ("id", "code", "name", "status_id")
VALUES
	(1, 'none', 'None', 1),
	(2, 'percent', 'Percent', 1),
	(3, 'amount', 'Amount', 1)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_discount_type" ADD CONSTRAINT "billing_discount_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'op_billing'
	) THEN
		CREATE INDEX IF NOT EXISTS "op_billing_discount_type_id_idx" ON "op_billing" USING btree ("discount_type_id");
		ALTER TABLE "op_billing" DROP CONSTRAINT IF EXISTS "op_billing_discount_type_id_billing_discount_type_id_fk";
		ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_discount_type_id_billing_discount_type_id_fk"
			FOREIGN KEY ("discount_type_id") REFERENCES "public"."billing_discount_type"("id")
			ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;
