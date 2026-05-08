-- Idempotent: bring inv_approval module CHECK constraints in line with
-- 0039 (DI) and 0040 (SI, SR), without running the full migration chain.
-- Safe to run in Neon / psql if `pnpm run db:migrate` is not an option.
ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'));

ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'));
