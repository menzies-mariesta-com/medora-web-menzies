-- Room capacity is derived from assigned beds (not manually set)
--> statement-breakpoint
ALTER TABLE "room" ALTER COLUMN "capacity" SET DEFAULT 0;
--> statement-breakpoint
UPDATE "room" r
SET "capacity" = COALESCE((
	SELECT COUNT(*)::int
	FROM "bed" b
	WHERE b."room_id" = r."id"
	  AND b."status_id" <> 4
), 0);
