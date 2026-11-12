-- Lineage lives on patient_visit.source_visit_id.

ALTER TABLE "ipd_admission" DROP COLUMN IF EXISTS "source_opd_visit_id";
