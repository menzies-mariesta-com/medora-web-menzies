-- Remove ED-only department consumption visit linkage and consumable billing config column.
ALTER TABLE "inv_department_consumption" DROP CONSTRAINT IF EXISTS "inv_department_consumption_visit_id_patient_visit_id_fk";
DROP INDEX IF EXISTS "inv_department_consumption_visit_id_idx";
ALTER TABLE "inv_department_consumption" DROP COLUMN IF EXISTS "visit_id";

ALTER TABLE "hospital_ed_billing_config" DROP COLUMN IF EXISTS "er_consumable_service_item_id";
