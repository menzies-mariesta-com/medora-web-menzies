-- Drop SI/SR from approval module enum/check, and remove existing rows.
-- These modules were UI-only placeholders and are no longer supported.

-- Remove assignees first to avoid FK constraints.
DELETE FROM "inv_approval_assignee"
WHERE "level_id" IN (
	SELECT "id"
	FROM "inv_approval_level"
	WHERE "module" IN ('SI', 'SR')
);

-- Remove levels.
DELETE FROM "inv_approval_level"
WHERE "module" IN ('SI', 'SR');

-- Remove logs (if any) so the module check can be tightened.
DELETE FROM "inv_approval_log"
WHERE "module" IN ('SI', 'SR');

ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
ALTER TABLE "inv_approval_level"
	ADD CONSTRAINT "inv_approval_level_module_chk"
	CHECK ("module" IN ('PR', 'PO', 'DI', 'GRN', 'DC'));

ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
ALTER TABLE "inv_approval_log"
	ADD CONSTRAINT "inv_approval_log_module_chk"
	CHECK ("module" IN ('PR', 'PO', 'DI', 'GRN', 'DC'));

