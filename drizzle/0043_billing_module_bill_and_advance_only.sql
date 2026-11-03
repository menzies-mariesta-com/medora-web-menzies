-- Billing module: only Bill + Advance Deposit (no "Billing" parent page in nav).
UPDATE page
SET parent_id = null,
	sequence_no = 1,
	updated_at = now()
WHERE id = 150003;

UPDATE page
SET parent_id = null,
	sequence_no = 2,
	updated_at = now()
WHERE id = 150002;

DELETE FROM user_group_page WHERE page_id = 150000;
DELETE FROM page WHERE id = 150000;

UPDATE module
SET module_url = '/medora/home/billing/bill',
	updated_at = now()
WHERE id = 8;
