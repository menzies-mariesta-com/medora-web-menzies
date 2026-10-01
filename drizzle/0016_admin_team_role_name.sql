-- Ensure role id 4 is Admin Team (legacy information seed used "Receptionist").
UPDATE "role"
SET "name" = 'Admin Team', "status_id" = 1
WHERE "id" = 4;
--> statement-breakpoint
INSERT INTO "role" ("id", "name", "status_id")
VALUES (4, 'Admin Team', 1)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"status_id" = EXCLUDED."status_id";
