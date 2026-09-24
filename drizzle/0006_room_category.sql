-- Room Category (markup %) + Room Master subpages
--> statement-breakpoint
CREATE TABLE "room_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"room_markup" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "room_category" ADD CONSTRAINT "room_category_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "room_category" ADD CONSTRAINT "room_category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "room_category_hospital_id_idx" ON "room_category" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX "room_category_status_id_idx" ON "room_category" USING btree ("status_id");
--> statement-breakpoint
-- Default category per hospital from existing room markups
INSERT INTO "room_category" ("hospital_id", "name", "code", "room_markup", "status_id")
SELECT DISTINCT
	r."hospital_id",
	'Standard',
	'STD',
	COALESCE((SELECT MAX(r2."room_markup") FROM "room" r2 WHERE r2."hospital_id" = r."hospital_id"), '0'),
	1
FROM "room" r;
--> statement-breakpoint
INSERT INTO "room_category" ("hospital_id", "name", "code", "room_markup", "status_id")
SELECT h."id", 'Standard', 'STD', '0', 1
FROM "hospital" h
WHERE NOT EXISTS (
	SELECT 1 FROM "room_category" c WHERE c."hospital_id" = h."id"
);
--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "room_category_id" integer;
--> statement-breakpoint
UPDATE "room" r
SET "room_category_id" = c."id"
FROM "room_category" c
WHERE c."hospital_id" = r."hospital_id" AND c."name" = 'Standard';
--> statement-breakpoint
DELETE FROM "room" WHERE "room_category_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "room" ALTER COLUMN "room_category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_room_category_id_room_category_id_fk" FOREIGN KEY ("room_category_id") REFERENCES "public"."room_category"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "room_category_id_idx" ON "room" USING btree ("room_category_id");
--> statement-breakpoint
ALTER TABLE "room" DROP COLUMN IF EXISTS "room_markup";
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no")
VALUES
	(470001, 'Room Category', 1, 1, 47, '/medora/home/administration/room-master/room-category', 1),
	(470002, 'Room', 1, 1, 47, '/medora/home/administration/room-master/room', 2)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no";
--> statement-breakpoint
INSERT INTO "user_group_page" ("user_group_id", "page_id")
SELECT ugp."user_group_id", 470001
FROM "user_group_page" ugp
WHERE ugp."page_id" = 47
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_page" x
    WHERE x."user_group_id" = ugp."user_group_id" AND x."page_id" = 470001
  );
--> statement-breakpoint
INSERT INTO "user_group_page" ("user_group_id", "page_id")
SELECT ugp."user_group_id", 470002
FROM "user_group_page" ugp
WHERE ugp."page_id" = 47
  AND NOT EXISTS (
    SELECT 1 FROM "user_group_page" x
    WHERE x."user_group_id" = ugp."user_group_id" AND x."page_id" = 470002
  );
