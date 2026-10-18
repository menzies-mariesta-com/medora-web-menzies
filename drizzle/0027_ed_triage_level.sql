CREATE TABLE IF NOT EXISTS "ed_triage_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"color" varchar(32) NOT NULL DEFAULT 'neutral',
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ed_triage_level" ADD CONSTRAINT "ed_triage_level_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ed_triage_level" ADD CONSTRAINT "ed_triage_level_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ed_triage_level_hospital_level_uidx" ON "ed_triage_level" USING btree ("hospital_id","level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ed_triage_level_hospital_id_idx" ON "ed_triage_level" USING btree ("hospital_id");
--> statement-breakpoint
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "ed_triage_level_id" integer;
--> statement-breakpoint
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "is_mlc" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "registration_remarks" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ed_encounter" ADD CONSTRAINT "ed_encounter_ed_triage_level_id_ed_triage_level_id_fk" FOREIGN KEY ("ed_triage_level_id") REFERENCES "public"."ed_triage_level"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
