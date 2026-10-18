-- Migrate patient_visit.id (serial integer) → UUID v7, and rewrite all FKs.
-- Historical entity UUIDs elsewhere (hospital, patient, …) are left as-is;
-- only visit PK/FK columns change type. New visit rows use UUID v7.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION medora_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
	unix_ts_ms bytea;
	uuid_bytes bytea;
BEGIN
	unix_ts_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
	uuid_bytes := unix_ts_ms || gen_random_bytes(10);
	-- version 7 (0111)
	uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
	-- RFC 4122 variant (10xxxxxx)
	uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
	RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;
--> statement-breakpoint

ALTER TABLE "patient_visit" ADD COLUMN IF NOT EXISTS "id_uuid" uuid;
--> statement-breakpoint

UPDATE "patient_visit"
SET "id_uuid" = medora_uuid_v7()
WHERE "id_uuid" IS NULL;
--> statement-breakpoint

ALTER TABLE "patient_visit" ALTER COLUMN "id_uuid" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "patient_visit" ALTER COLUMN "id_uuid" SET DEFAULT medora_uuid_v7();
--> statement-breakpoint

-- Drop every FK that references patient_visit(id) (integer PK).
DO $$
DECLARE
	r record;
BEGIN
	FOR r IN
		SELECT con.conname AS constraint_name, rel.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class rel ON rel.oid = con.conrelid
		JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
		WHERE con.contype = 'f'
			AND nsp.nspname = 'public'
			AND con.confrelid = 'public.patient_visit'::regclass
	LOOP
		EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
	END LOOP;
END $$;
--> statement-breakpoint

-- Unique indexes that include integer visit_id must be dropped before column swap.
DROP INDEX IF EXISTS "discharge_summary_visit_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ipd_admission_visit_active_uidx";
--> statement-breakpoint

-- Helper: migrate one integer visit FK column to uuid using patient_visit.id_uuid map.
DO $$
DECLARE
	t text;
	col text;
	is_not_null boolean;
	tmp_col text;
BEGIN
	FOR t, col, is_not_null IN
		SELECT * FROM (VALUES
			('patient_allergy', 'visit_id', true),
			('patient_document', 'visit_id', true),
			('patient_diagnosis', 'visit_id', true),
			('diagnosis', 'visit_id', true),
			('patient_form_entry', 'visit_id', true),
			('plan_of_care', 'visit_id', true),
			('cpoe_prescription_note', 'visit_id', true),
			('progress_note', 'visit_id', true),
			('service_order', 'visit_id', true),
			('op_billing', 'visit_id', true),
			('refer_history', 'visit_id', true),
			('ipd_admission', 'visit_id', true),
			('ipd_admission', 'source_opd_visit_id', false),
			('ip_billing', 'visit_id', true),
			('discharge_summary', 'visit_id', true),
			('lab_result', 'visit_id', true),
			('imaging_result', 'visit_id', true),
			('clinical_procedure', 'visit_id', true),
			('operative_note', 'visit_id', true),
			('ipd_admission_order', 'source_opd_visit_id', true),
			('ip_advance_deposit', 'visit_id', true),
			('medication_order_batch', 'visit_id', false),
			('notification', 'visit_id', false)
		) AS v(table_name, column_name, required)
	LOOP
		-- Skip tables that do not exist yet (fresh / partial DBs).
		IF to_regclass(format('public.%I', t)) IS NULL THEN
			CONTINUE;
		END IF;
		-- Skip if column already uuid (re-run safety).
		IF EXISTS (
			SELECT 1
			FROM information_schema.columns c
			WHERE c.table_schema = 'public'
				AND c.table_name = t
				AND c.column_name = col
				AND c.data_type = 'uuid'
		) THEN
			CONTINUE;
		END IF;
		-- Skip if integer column missing.
		IF NOT EXISTS (
			SELECT 1
			FROM information_schema.columns c
			WHERE c.table_schema = 'public'
				AND c.table_name = t
				AND c.column_name = col
		) THEN
			CONTINUE;
		END IF;

		tmp_col := col || '_uuid';
		EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I uuid', t, tmp_col);
		EXECUTE format(
			'UPDATE %I AS child SET %I = pv.id_uuid FROM patient_visit pv WHERE child.%I = pv.id',
			t, tmp_col, col
		);
		EXECUTE format('ALTER TABLE %I DROP COLUMN %I', t, col);
		EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', t, tmp_col, col);
		IF is_not_null THEN
			EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', t, col);
		END IF;
	END LOOP;
END $$;
--> statement-breakpoint

-- Swap patient_visit primary key to uuid.
ALTER TABLE "patient_visit" DROP CONSTRAINT IF EXISTS "patient_visit_pkey";
--> statement-breakpoint
ALTER TABLE "patient_visit" DROP COLUMN IF EXISTS "id";
--> statement-breakpoint
ALTER TABLE "patient_visit" RENAME COLUMN "id_uuid" TO "id";
--> statement-breakpoint
ALTER TABLE "patient_visit" ADD PRIMARY KEY ("id");
--> statement-breakpoint

-- Drop leftover serial sequence if present.
DROP SEQUENCE IF EXISTS "patient_visit_id_seq";
--> statement-breakpoint

-- Recreate FKs (ON DELETE matches prior schema / drizzle definitions).
DO $$ BEGIN
	ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_order" ADD CONSTRAINT "service_order_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_source_opd_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("source_opd_visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "discharge_summary" ADD CONSTRAINT "discharge_summary_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lab_result" ADD CONSTRAINT "lab_result_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "imaging_result" ADD CONSTRAINT "imaging_result_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "clinical_procedure" ADD CONSTRAINT "clinical_procedure_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "operative_note" ADD CONSTRAINT "operative_note_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_source_opd_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("source_opd_visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification" ADD CONSTRAINT "notification_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "discharge_summary_visit_uidx" ON "discharge_summary" ("visit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ipd_admission_visit_active_uidx"
	ON "ipd_admission" ("visit_id")
	WHERE "admission_status" = 1;
