CREATE TABLE IF NOT EXISTS "er_ward_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"ward_markup" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "er_room_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"room_markup" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "er_ward" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"er_ward_category_id" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "er_room" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"er_ward_id" integer NOT NULL,
	"er_room_category_id" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"capacity" integer DEFAULT 0 NOT NULL,
	"amenities" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "er_bed" (
	"id" serial PRIMARY KEY NOT NULL,
	"er_room_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"base_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"bed_status" integer DEFAULT 1 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "er_ward_category" ADD CONSTRAINT "er_ward_category_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_ward_category" ADD CONSTRAINT "er_ward_category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "er_room_category" ADD CONSTRAINT "er_room_category_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_room_category" ADD CONSTRAINT "er_room_category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "er_ward" ADD CONSTRAINT "er_ward_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_ward" ADD CONSTRAINT "er_ward_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_ward" ADD CONSTRAINT "er_ward_er_ward_category_id_er_ward_category_id_fk" FOREIGN KEY ("er_ward_category_id") REFERENCES "public"."er_ward_category"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "er_ward" ADD CONSTRAINT "er_ward_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "er_room" ADD CONSTRAINT "er_room_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_room" ADD CONSTRAINT "er_room_er_ward_id_er_ward_id_fk" FOREIGN KEY ("er_ward_id") REFERENCES "public"."er_ward"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_room" ADD CONSTRAINT "er_room_er_room_category_id_er_room_category_id_fk" FOREIGN KEY ("er_room_category_id") REFERENCES "public"."er_room_category"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "er_room" ADD CONSTRAINT "er_room_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "er_bed" ADD CONSTRAINT "er_bed_er_room_id_er_room_id_fk" FOREIGN KEY ("er_room_id") REFERENCES "public"."er_room"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_bed" ADD CONSTRAINT "er_bed_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "er_bed" ADD CONSTRAINT "er_bed_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "er_ward_category_hospital_id_idx" ON "er_ward_category" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "er_ward_category_status_id_idx" ON "er_ward_category" USING btree ("status_id");
CREATE INDEX IF NOT EXISTS "er_room_category_hospital_id_idx" ON "er_room_category" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "er_room_category_status_id_idx" ON "er_room_category" USING btree ("status_id");
CREATE INDEX IF NOT EXISTS "er_ward_hospital_id_idx" ON "er_ward" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "er_ward_branch_id_idx" ON "er_ward" USING btree ("branch_id");
CREATE INDEX IF NOT EXISTS "er_ward_category_id_idx" ON "er_ward" USING btree ("er_ward_category_id");
CREATE INDEX IF NOT EXISTS "er_ward_status_id_idx" ON "er_ward" USING btree ("status_id");
CREATE INDEX IF NOT EXISTS "er_room_hospital_id_idx" ON "er_room" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "er_room_ward_id_idx" ON "er_room" USING btree ("er_ward_id");
CREATE INDEX IF NOT EXISTS "er_room_category_id_idx" ON "er_room" USING btree ("er_room_category_id");
CREATE INDEX IF NOT EXISTS "er_room_status_id_idx" ON "er_room" USING btree ("status_id");
CREATE INDEX IF NOT EXISTS "er_bed_room_id_idx" ON "er_bed" USING btree ("er_room_id");
CREATE INDEX IF NOT EXISTS "er_bed_hospital_id_idx" ON "er_bed" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "er_bed_bed_status_idx" ON "er_bed" USING btree ("bed_status");
CREATE INDEX IF NOT EXISTS "er_bed_status_id_idx" ON "er_bed" USING btree ("status_id");

ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "er_ward_id" integer;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "er_room_id" integer;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "er_bed_id" integer;
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "er_bed_assigned_at" timestamp with time zone;

DO $$ BEGIN
 ALTER TABLE "ed_encounter" ADD CONSTRAINT "ed_encounter_er_ward_id_er_ward_id_fk" FOREIGN KEY ("er_ward_id") REFERENCES "public"."er_ward"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ed_encounter" ADD CONSTRAINT "ed_encounter_er_room_id_er_room_id_fk" FOREIGN KEY ("er_room_id") REFERENCES "public"."er_room"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ed_encounter" ADD CONSTRAINT "ed_encounter_er_bed_id_er_bed_id_fk" FOREIGN KEY ("er_bed_id") REFERENCES "public"."er_bed"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
