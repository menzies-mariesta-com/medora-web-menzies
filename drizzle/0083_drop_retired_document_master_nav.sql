-- Retired: Master Templates (100704) and Hospital template access (100705).
-- Replaced by Medora admin Global documents + hospital Reusable Global Documents (100707).

DELETE FROM user_group_page WHERE page_id IN (100704, 100705);
--> statement-breakpoint
DELETE FROM page WHERE id IN (100704, 100705);
--> statement-breakpoint
DELETE FROM user_group_page
WHERE page_id IN (
	SELECT id FROM page
	WHERE page_url IN (
		'/medora/home/administration/document-master/template-library',
		'/medora/home/administration/document-master/hospital-templates'
	)
);
--> statement-breakpoint
DELETE FROM page
WHERE page_url IN (
	'/medora/home/administration/document-master/template-library',
	'/medora/home/administration/document-master/hospital-templates'
);
