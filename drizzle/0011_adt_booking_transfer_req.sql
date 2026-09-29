-- ADT: bed booking + bed transfer requisition tables and status tagging
--> statement-breakpoint
INSERT INTO "status_tagging_type" ("id", "name")
VALUES
	(12, 'IPD Bed Booking'),
	(13, 'IPD Bed Transfer Requisition')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
--> statement-breakpoint
INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES
	(60, 'Booked', 'booked', 1, 12),
	(61, 'Cancelled', 'cancelled', 2, 12),
	(62, 'Converted', 'converted', 3, 12),
	(63, 'Draft', 'draft', 1, 13),
	(64, 'Pending', 'pending', 2, 13),
	(65, 'Approved', 'approved', 3, 13),
	(66, 'Completed', 'completed', 4, 13),
	(67, 'Cancelled', 'cancelled', 5, 13)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ipd_bed_booking" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid,
	"patient_title_id" integer,
	"patient_name" varchar(512),
	"patient_date_of_birth" date,
	"patient_age_year" integer,
	"patient_age_month" integer,
	"patient_age_day" integer,
	"phone" varchar(128),
	"email" varchar(512),
	"preferred_ward_id" integer,
	"preferred_bed_id" integer,
	"expected_admit_at" timestamp with time zone,
	"admitting_doctor_id" uuid,
	"remark" text,
	"status_tagging_id" integer DEFAULT 60 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ipd_bed_transfer_requisition" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"admission_id" integer NOT NULL,
	"from_bed_id" integer NOT NULL,
	"to_bed_id" integer,
	"to_ward_id" integer,
	"requested_by_staff_id" uuid,
	"remark" text,
	"status_tagging_id" integer DEFAULT 63 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_booking" ADD CONSTRAINT "ipd_bed_booking_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_booking" ADD CONSTRAINT "ipd_bed_booking_branch_id_hospital_branch_id_fk"
		FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_booking" ADD CONSTRAINT "ipd_bed_booking_patient_id_patient_id_fk"
		FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_booking" ADD CONSTRAINT "ipd_bed_booking_status_tagging_id_status_tagging_id_fk"
		FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_transfer_requisition" ADD CONSTRAINT "ipd_bed_xfer_req_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_transfer_requisition" ADD CONSTRAINT "ipd_bed_xfer_req_admission_id_fk"
		FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_transfer_requisition" ADD CONSTRAINT "ipd_bed_xfer_req_from_bed_id_fk"
		FOREIGN KEY ("from_bed_id") REFERENCES "public"."bed"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_bed_transfer_requisition" ADD CONSTRAINT "ipd_bed_xfer_req_status_tagging_id_fk"
		FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_booking_hospital_id_idx" ON "ipd_bed_booking" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_booking_branch_id_idx" ON "ipd_bed_booking" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_booking_patient_id_idx" ON "ipd_bed_booking" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_booking_status_tagging_id_idx" ON "ipd_bed_booking" USING btree ("status_tagging_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_xfer_req_hospital_id_idx" ON "ipd_bed_transfer_requisition" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_xfer_req_admission_id_idx" ON "ipd_bed_transfer_requisition" USING btree ("admission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_bed_xfer_req_status_tagging_id_idx" ON "ipd_bed_transfer_requisition" USING btree ("status_tagging_id");
--> statement-breakpoint
INSERT INTO "module" ("id", "name", "sequence_no", "status_id", "module_url", "image_url")
VALUES (7, 'ADT', 7, 1, '/medora/home/adt', 'bed-double')
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"sequence_no" = EXCLUDED."sequence_no",
	"module_url" = EXCLUDED."module_url",
	"image_url" = EXCLUDED."image_url";
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no")
VALUES
	(52, 'Bed Status', 7, 1, null, '/medora/home/adt/bed-status', 1),
	(53, 'Admission', 7, 1, null, '/medora/home/adt/admission', 2),
	(54, 'Booking', 7, 1, null, '/medora/home/adt/booking', 3),
	(55, 'Bed Transfer Requisition', 7, 1, null, '/medora/home/adt/bed-transfer-requisition', 4)
ON CONFLICT ("id") DO NOTHING;
