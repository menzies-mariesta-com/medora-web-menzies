-- Ward Category + move Room Master to top-level page
--> statement-breakpoint
CREATE TABLE "ward_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"ward_markup" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "ward_category" ADD CONSTRAINT "ward_category_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ward_category" ADD CONSTRAINT "ward_category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ward_category_hospital_id_idx" ON "ward_category" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "ward_category_status_id_idx" ON "ward_category" USING btree ("status_id");
--> statement-breakpoint
-- One default category per hospital from existing ward markups (use max markup or 0)
INSERT INTO "ward_category" ("hospital_id", "name", "code", "ward_markup", "status_id")
SELECT DISTINCT
	w."hospital_id",
	'General',
	'GEN',
	COALESCE((SELECT MAX(w2."ward_markup") FROM "ward" w2 WHERE w2."hospital_id" = w."hospital_id"), '0'),
	1
FROM "ward" w;
--> statement-breakpoint
-- Hospitals with no wards yet still get a default category for create forms
INSERT INTO "ward_category" ("hospital_id", "name", "code", "ward_markup", "status_id")
SELECT h."id", 'General', 'GEN', '0', 1
FROM "hospital" h
WHERE NOT EXISTS (
	SELECT 1 FROM "ward_category" c WHERE c."hospital_id" = h."id"
);
--> statement-breakpoint
ALTER TABLE "ward" ADD COLUMN "ward_category_id" integer;
--> statement-breakpoint
UPDATE "ward" w
SET "ward_category_id" = c."id"
FROM "ward_category" c
WHERE c."hospital_id" = w."hospital_id" AND c."name" = 'General';
--> statement-breakpoint
DELETE FROM "ward" WHERE "ward_category_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "ward" ALTER COLUMN "ward_category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_ward_category_id_ward_category_id_fk" FOREIGN KEY ("ward_category_id") REFERENCES "public"."ward_category"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ward_category_id_idx" ON "ward" USING btree ("ward_category_id");
--> statement-breakpoint
ALTER TABLE "ward" DROP COLUMN IF EXISTS "ward_markup";
--> statement-breakpoint
-- Page restructure: Ward Category + Ward under Ward Master; Room Master top-level
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no")
VALUES
	(450001, 'Ward Category', 1, 1, 45, '/medora/home/administration/ward-master/ward-category', 1),
	(450002, 'Ward', 1, 1, 45, '/medora/home/administration/ward-master/ward', 2),
	(47, 'Room Master', 1, 1, null, '/medora/home/administration/room-master', 14)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no";
--> statement-breakpoint
UPDATE "page" SET "sequence_no" = 15 WHERE "id" = 46;
--> statement-breakpoint
-- Soft-remove old Room-under-Ward-Master page id if it was only room (already reused as Ward above)
-- Grant Room Master + Ward Category to groups that had Ward Master
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
--> statement-breakpoint
INSERT INTO "user_group_page" ("user_group_id", "page_id")
SELECT ugp."user_group_id", 47
FROM "user_group_page" ugp
WHERE ugp."page_id" = 45
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_page" x
    WHERE x."user_group_id" = ugp."user_group_id" AND x."page_id" = 47
  );
