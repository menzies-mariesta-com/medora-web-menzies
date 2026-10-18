ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "discharged_at" timestamptz;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "retain_er_bed_after_discharge" boolean DEFAULT false NOT NULL;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "discharge_remarks" text;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "er_bed_charge_service_order_detail_id" integer;

ALTER TABLE "inv_department_consumption" ADD COLUMN IF NOT EXISTS "visit_id" uuid;
DO $$ BEGIN
 ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "inv_department_consumption_visit_id_idx" ON "inv_department_consumption" ("visit_id");

ALTER TABLE "op_billing_line" ADD COLUMN IF NOT EXISTS "department_consumption_line_id" integer;

CREATE TABLE IF NOT EXISTS "hospital_ed_billing_config" (
	"hospital_id" uuid PRIMARY KEY NOT NULL REFERENCES "hospital"("id") ON DELETE cascade,
	"er_bed_service_item_id" integer REFERENCES "service_item"("id") ON DELETE set null,
	"er_consumable_service_item_id" integer REFERENCES "service_item"("id") ON DELETE set null,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
