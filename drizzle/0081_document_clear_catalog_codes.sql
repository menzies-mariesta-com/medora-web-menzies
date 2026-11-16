-- Retired catalog keys in DB; runtime identity is document.id + hospital_document.
UPDATE document
SET code = NULL,
	updated_at = now()
WHERE code LIKE 'CATALOG_%';
