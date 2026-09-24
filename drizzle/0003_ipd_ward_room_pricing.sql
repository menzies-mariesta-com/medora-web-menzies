-- IPD Ward → Room → Bed + additive pricing + stay segments + billing policy
--> statement-breakpoint
ALTER TABLE "ward" ADD COLUMN "ward_markup" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
CREATE TABLE "room" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"ward_id" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"capacity" integer DEFAULT 1 NOT NULL,
	"room_markup" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amenities" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_ward_id_ward_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."ward"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "room_hospital_id_idx" ON "room" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "room_ward_id_idx" ON "room" USING btree ("ward_id");
--> statement-breakpoint
CREATE INDEX "room_status_id_idx" ON "room" USING btree ("status_id");
--> statement-breakpoint
-- One default room per existing ward (capacity = bed count, min 1)
INSERT INTO "room" ("hospital_id", "ward_id", "name", "code", "capacity", "room_markup", "status_id")
SELECT
	w."hospital_id",
	w."id",
	'Default',
	CASE WHEN w."code" IS NOT NULL AND w."code" <> '' THEN w."code" || '-DEF' ELSE NULL END,
	GREATEST(1, (SELECT COUNT(*)::integer FROM "bed" b WHERE b."ward_id" = w."id")),
	'0',
	w."status_id"
FROM "ward" w;
--> statement-breakpoint
ALTER TABLE "bed" ADD COLUMN "room_id" integer;
--> statement-breakpoint
ALTER TABLE "bed" ADD COLUMN "base_price" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE "bed" b
SET "room_id" = r."id"
FROM "room" r
WHERE r."ward_id" = b."ward_id" AND r."name" = 'Default';
--> statement-breakpoint
DELETE FROM "bed" WHERE "room_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "bed" ALTER COLUMN "room_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bed" DROP CONSTRAINT IF EXISTS "bed_ward_id_ward_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "bed_ward_id_idx";
--> statement-breakpoint
ALTER TABLE "bed" DROP COLUMN "ward_id";
--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bed_room_id_idx" ON "bed" USING btree ("room_id");
--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD COLUMN "room_id" integer;
--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD COLUMN "ot_hold_location" varchar(256);
--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD COLUMN "ot_hold_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "ipd_admission" a
SET "room_id" = b."room_id"
FROM "bed" b
WHERE b."id" = a."bed_id";
--> statement-breakpoint
-- Orphan admissions without bed: attach default room of their ward
UPDATE "ipd_admission" a
SET "room_id" = r."id"
FROM "room" r
WHERE a."room_id" IS NULL AND r."ward_id" = a."ward_id" AND r."name" = 'Default';
--> statement-breakpoint
DELETE FROM "ipd_admission" WHERE "room_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "ipd_admission" ALTER COLUMN "room_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ipd_admission_room_id_idx" ON "ipd_admission" USING btree ("room_id");
--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD COLUMN "from_room_id" integer;
--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD COLUMN "to_room_id" integer;
--> statement-breakpoint
UPDATE "ipd_bed_history" h
SET "to_room_id" = b."room_id"
FROM "bed" b
WHERE b."id" = h."to_bed_id";
--> statement-breakpoint
UPDATE "ipd_bed_history" h
SET "from_room_id" = b."room_id"
FROM "bed" b
WHERE h."from_bed_id" IS NOT NULL AND b."id" = h."from_bed_id";
--> statement-breakpoint
UPDATE "ipd_bed_history" h
SET "to_room_id" = r."id"
FROM "room" r
WHERE h."to_room_id" IS NULL AND r."ward_id" = h."to_ward_id" AND r."name" = 'Default';
--> statement-breakpoint
DELETE FROM "ipd_bed_history" WHERE "to_room_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ALTER COLUMN "to_room_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_from_room_id_room_id_fk" FOREIGN KEY ("from_room_id") REFERENCES "public"."room"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_to_room_id_room_id_fk" FOREIGN KEY ("to_room_id") REFERENCES "public"."room"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ipd_bed_history_to_room_id_idx" ON "ipd_bed_history" USING btree ("to_room_id");
--> statement-breakpoint
CREATE TABLE "ipd_bed_stay_segment" (
	"id" serial PRIMARY KEY NOT NULL,
	"admission_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"ward_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"bed_id" integer NOT NULL,
	"ward_name_snapshot" varchar(512),
	"room_name_snapshot" varchar(512),
	"bed_name_snapshot" varchar(512),
	"bed_base_price_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL,
	"room_markup_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ward_markup_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL,
	"daily_tariff_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_admission_id_ipd_admission_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_ward_id_ward_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."ward"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_bed_id_bed_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."bed"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ipd_bed_stay_segment_admission_id_idx" ON "ipd_bed_stay_segment" USING btree ("admission_id");
--> statement-breakpoint
CREATE INDEX "ipd_bed_stay_segment_hospital_id_idx" ON "ipd_bed_stay_segment" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "ipd_bed_stay_segment_open_idx" ON "ipd_bed_stay_segment" USING btree ("admission_id") WHERE "ended_at" IS NULL;
--> statement-breakpoint
-- Backfill open segments for currently admitted patients
INSERT INTO "ipd_bed_stay_segment" (
	"admission_id", "hospital_id", "ward_id", "room_id", "bed_id",
	"ward_name_snapshot", "room_name_snapshot", "bed_name_snapshot",
	"bed_base_price_snapshot", "room_markup_snapshot", "ward_markup_snapshot", "daily_tariff_snapshot",
	"started_at", "status_id"
)
SELECT
	a."id",
	a."hospital_id",
	a."ward_id",
	a."room_id",
	a."bed_id",
	w."name",
	r."name",
	b."name",
	COALESCE(b."base_price", '0'),
	COALESCE(r."room_markup", '0'),
	COALESCE(w."ward_markup", '0'),
	(COALESCE(b."base_price", 0) + COALESCE(r."room_markup", 0) + COALESCE(w."ward_markup", 0)),
	a."admitted_at",
	1
FROM "ipd_admission" a
INNER JOIN "ward" w ON w."id" = a."ward_id"
INNER JOIN "room" r ON r."id" = a."room_id"
INNER JOIN "bed" b ON b."id" = a."bed_id"
WHERE a."admission_status" = 1;
--> statement-breakpoint
CREATE TABLE "ipd_accommodation_billing_policy" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"billing_method" integer DEFAULT 1 NOT NULL,
	"grace_minutes" integer DEFAULT 0 NOT NULL,
	"minimum_days" numeric(8, 4),
	"cutoff_time" varchar(8) DEFAULT '00:00' NOT NULL,
	"accommodation_service_item_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "ipd_accommodation_billing_policy" ADD CONSTRAINT "ipd_accommodation_billing_policy_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_accommodation_billing_policy" ADD CONSTRAINT "ipd_accommodation_billing_policy_accommodation_service_item_id_service_item_id_fk" FOREIGN KEY ("accommodation_service_item_id") REFERENCES "public"."service_item"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ipd_accommodation_billing_policy" ADD CONSTRAINT "ipd_accommodation_billing_policy_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ipd_accommodation_billing_policy_hospital_uidx" ON "ipd_accommodation_billing_policy" USING btree ("hospital_id");
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no")
VALUES
	(450001, 'Ward', 1, 1, 45, '/medora/home/administration/ward-master/ward', 1),
	(450002, 'Room', 1, 1, 45, '/medora/home/administration/ward-master/room', 2)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no";
--> statement-breakpoint
INSERT INTO "user_group_page" ("user_group_id", "page_id")
SELECT ugp."user_group_id", 450001
FROM "user_group_page" ugp
WHERE ugp."page_id" = 45
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_page" x
    WHERE x."user_group_id" = ugp."user_group_id" AND x."page_id" = 450001
  );
--> statement-breakpoint
INSERT INTO "user_group_page" ("user_group_id", "page_id")
SELECT ugp."user_group_id", 450002
FROM "user_group_page" ugp
WHERE ugp."page_id" = 45
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_page" x
    WHERE x."user_group_id" = ugp."user_group_id" AND x."page_id" = 450002
  );
