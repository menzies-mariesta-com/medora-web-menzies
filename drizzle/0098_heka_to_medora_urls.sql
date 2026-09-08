-- Rename Heka URL prefixes to Medora for module/page navigation ACL.
UPDATE module
SET module_url = REPLACE(module_url, '/heka/', '/medora/')
WHERE module_url LIKE '/heka/%';

UPDATE page
SET page_url = REPLACE(page_url, '/heka/', '/medora/')
WHERE page_url LIKE '/heka/%';
