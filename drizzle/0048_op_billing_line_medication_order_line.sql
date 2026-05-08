ALTER TABLE "op_billing_line" ADD COLUMN IF NOT EXISTS "medication_order_line_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_medication_order_line_id_medication_order_line_id_fk" FOREIGN KEY ("medication_order_line_id") REFERENCES "public"."medication_order_line"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_line_medication_order_line_id_idx" ON "op_billing_line" USING btree ("medication_order_line_id");
