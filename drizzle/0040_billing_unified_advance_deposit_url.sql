-- Unified billing nav: advance deposit under /billing/advance-deposit (not ip-billing).
UPDATE page
SET page_url = '/medora/home/billing/advance-deposit',
	updated_at = now()
WHERE id = 150002;
