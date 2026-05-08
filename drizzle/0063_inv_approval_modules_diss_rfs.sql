-- Add separate approval modules for:
-- - DISS: Department issue approvals
-- - RFS: Receipt-from-store receive permission

ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
ALTER TABLE "inv_approval_level"
	ADD CONSTRAINT "inv_approval_level_module_chk"
	CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'));

ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
ALTER TABLE "inv_approval_log"
	ADD CONSTRAINT "inv_approval_log_module_chk"
	CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'));

