-- Remove retired Administration nav: Clinical platform, Clinical tasks, ROI, Ambulatory, ED billing setup.

DELETE FROM "user_group_page"
WHERE "page_id" IN (
	360001,
	360002,
	360003,
	360004,
	360005,
	360006,
	365001,
	365002,
	365003,
	360,
	361,
	364,
	365,
	455
);

DELETE FROM "page"
WHERE "id" IN (
	360001,
	360002,
	360003,
	360004,
	360005,
	360006,
	365001,
	365002,
	365003
);

DELETE FROM "page"
WHERE "id" IN (360, 361, 364, 365, 455);
