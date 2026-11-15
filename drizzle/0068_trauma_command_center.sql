CREATE TABLE IF NOT EXISTS "hospital_trauma_activation_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"color" varchar(32) DEFAULT 'error' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_trauma_milestone_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"label" varchar(512) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_trauma_team_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"label" varchar(512) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trauma_activation_milestone" (
	"id" serial PRIMARY KEY NOT NULL,
	"trauma_activation_id" integer NOT NULL,
	"milestone_template_id" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trauma_activation_team_ack" (
	"id" serial PRIMARY KEY NOT NULL,
	"trauma_activation_id" integer NOT NULL,
	"team_role_id" integer NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"staff_id" uuid
);
--> statement-breakpoint
-- DBs that skipped drizzle/0020 still need the base table before these alters.
CREATE TABLE IF NOT EXISTS "trauma_activation" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"level_code" varchar(16) NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"form_instance_id" integer,
	"activated_by" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trauma_activation_hospital_idx" ON "trauma_activation" ("hospital_id");
--> statement-breakpoint
ALTER TABLE "trauma_activation" ADD COLUMN IF NOT EXISTS "activation_level_id" integer;
--> statement-breakpoint
ALTER TABLE "trauma_activation" ADD COLUMN IF NOT EXISTS "deactivate_reason" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_activation_level" ADD CONSTRAINT "hospital_trauma_activation_level_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_activation_level" ADD CONSTRAINT "hospital_trauma_activation_level_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_trauma_activation_level_hospital_code_uidx" ON "hospital_trauma_activation_level" USING btree ("hospital_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_trauma_activation_level_hospital_id_idx" ON "hospital_trauma_activation_level" USING btree ("hospital_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_milestone_template" ADD CONSTRAINT "hospital_trauma_milestone_template_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_milestone_template" ADD CONSTRAINT "hospital_trauma_milestone_template_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_trauma_milestone_tpl_hospital_code_uidx" ON "hospital_trauma_milestone_template" USING btree ("hospital_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_trauma_milestone_tpl_hospital_id_idx" ON "hospital_trauma_milestone_template" USING btree ("hospital_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_team_role" ADD CONSTRAINT "hospital_trauma_team_role_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_trauma_team_role" ADD CONSTRAINT "hospital_trauma_team_role_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_trauma_team_role_hospital_code_uidx" ON "hospital_trauma_team_role" USING btree ("hospital_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_trauma_team_role_hospital_id_idx" ON "hospital_trauma_team_role" USING btree ("hospital_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_milestone" ADD CONSTRAINT "trauma_activation_milestone_trauma_activation_id_trauma_activation_id_fk" FOREIGN KEY ("trauma_activation_id") REFERENCES "public"."trauma_activation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_milestone" ADD CONSTRAINT "trauma_activation_milestone_milestone_template_id_hospital_trauma_milestone_template_id_fk" FOREIGN KEY ("milestone_template_id") REFERENCES "public"."hospital_trauma_milestone_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_milestone" ADD CONSTRAINT "trauma_activation_milestone_completed_by_staff_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trauma_activation_milestone_uidx" ON "trauma_activation_milestone" USING btree ("trauma_activation_id","milestone_template_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_team_ack" ADD CONSTRAINT "trauma_activation_team_ack_trauma_activation_id_trauma_activation_id_fk" FOREIGN KEY ("trauma_activation_id") REFERENCES "public"."trauma_activation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_team_ack" ADD CONSTRAINT "trauma_activation_team_ack_team_role_id_hospital_trauma_team_role_id_fk" FOREIGN KEY ("team_role_id") REFERENCES "public"."hospital_trauma_team_role"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation_team_ack" ADD CONSTRAINT "trauma_activation_team_ack_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trauma_activation_team_ack_uidx" ON "trauma_activation_team_ack" USING btree ("trauma_activation_id","team_role_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trauma_activation" ADD CONSTRAINT "trauma_activation_activation_level_id_hospital_trauma_activation_level_id_fk" FOREIGN KEY ("activation_level_id") REFERENCES "public"."hospital_trauma_activation_level"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;