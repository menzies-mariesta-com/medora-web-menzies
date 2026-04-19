-- Item Master ↔ Item Unit Master: mark default conversion with Yes/No digit (0/1)

ALTER TABLE "item_master_item_unit_master" ADD COLUMN "is_default_yes_no" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "item_master_item_unit_master" AS t
SET "is_default_yes_no" = 1
WHERE t."id" IN (
	SELECT DISTINCT ON ("hospital_id", "item_master_id") "id"
	FROM "item_master_item_unit_master"
	WHERE "deleted_at" IS NULL
	ORDER BY "hospital_id", "item_master_id", "id"
);
--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "im_ium_is_default_yes_no_chk" CHECK ("is_default_yes_no" IN (0, 1));
--> statement-breakpoint
CREATE UNIQUE INDEX "im_ium_one_default_per_item_unique" ON "item_master_item_unit_master" ("hospital_id", "item_master_id") WHERE "deleted_at" IS NULL AND "is_default_yes_no" = 1;
