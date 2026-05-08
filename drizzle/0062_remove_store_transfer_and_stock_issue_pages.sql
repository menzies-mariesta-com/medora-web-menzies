-- Remove Store Transfer (page id 31) and Stock Issue (page id 32)
-- from page navigation + user group permissions.
--
-- Note: This does NOT drop inventory tables or status_tagging types.

DELETE FROM "user_group_page" WHERE "page_id" IN (31, 32);
DELETE FROM "page" WHERE "id" IN (31, 32);

