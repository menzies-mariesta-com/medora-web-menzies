-- Granular per-page permissions: user_group_page gains an action code.
-- One row per (group, page, action). Existing rows were "full access", so they
-- are kept as `view` and backfilled with create/edit/delete below.
ALTER TABLE "user_group_page"
	ADD COLUMN IF NOT EXISTS "action_code" varchar(48) DEFAULT 'view' NOT NULL;
--> statement-breakpoint
-- Normalize any NULLs from a partially applied run before adding the constraint.
UPDATE "user_group_page" SET "action_code" = 'view' WHERE "action_code" IS NULL;
--> statement-breakpoint
-- Remove exact duplicates so the unique constraint can be added idempotently.
DELETE FROM "user_group_page" a
	USING "user_group_page" b
	WHERE a.id > b.id
		AND a."user_group_id" = b."user_group_id"
		AND a."page_id" = b."page_id"
		AND a."action_code" = b."action_code";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_group_page_action_unique" UNIQUE("user_group_id","page_id","action_code");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill: every pre-existing grant becomes full CRUD, so no group loses access on deploy.
INSERT INTO "user_group_page" ("user_group_id", "page_id", "action_code")
SELECT DISTINCT gp."user_group_id", gp."page_id", a.action
FROM "user_group_page" gp
	CROSS JOIN unnest(ARRAY['create', 'edit', 'delete']) AS a(action)
WHERE gp."user_group_id" IS NOT NULL
	AND gp."page_id" IS NOT NULL
ON CONFLICT ("user_group_id", "page_id", "action_code") DO NOTHING;
