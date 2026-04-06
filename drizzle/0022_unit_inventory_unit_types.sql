INSERT INTO "unit_type" ("id", "name", "status_id")
VALUES
	(9, 'Count / Pack', 1),
	(10, 'Volume', 1)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "unit" ("id", "name", "unit_type_id", "status_id")
VALUES
	(13, 'tablet', 9, 1),
	(14, 'capsule', 9, 1),
	(15, 'ampoule', 9, 1),
	(16, 'vial', 9, 1),
	(17, 'strip', 9, 1),
	(18, 'box', 9, 1),
	(19, 'bottle', 9, 1),
	(20, 'piece', 9, 1),
	(21, 'ml', 10, 1),
	(22, 'L', 10, 1)
ON CONFLICT ("id") DO NOTHING;
