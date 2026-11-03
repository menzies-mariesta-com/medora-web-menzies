-- Advance Deposit is a sibling of Bill (not a nav child that hijacks Bill).
UPDATE page
SET parent_id = null,
	updated_at = now()
WHERE id = 150002;
