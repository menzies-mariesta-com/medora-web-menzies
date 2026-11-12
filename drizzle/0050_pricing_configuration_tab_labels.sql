-- Shorter sub-tab labels for pricing configuration section.

UPDATE page
SET name = 'Assignments', updated_at = now()
WHERE id = 900801;

UPDATE page
SET name = 'Formula templates', updated_at = now()
WHERE id = 900802;
