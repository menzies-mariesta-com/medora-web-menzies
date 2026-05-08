-- Extend approval module codes for stock issue (SI) and inter-store receipt (SR).
ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'SI', 'SR'));

ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'SI', 'SR'));
