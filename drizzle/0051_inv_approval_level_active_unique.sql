-- Allow re-creating a level after soft-delete: uniqueness only for active (non-deleted) rows.
DROP INDEX IF EXISTS "inv_approval_level_store_module_level_uidx";
CREATE UNIQUE INDEX "inv_approval_level_store_module_level_active_uidx"
	ON "inv_approval_level" ("hospital_id", "store_id", "module", "level")
	WHERE "deleted_at" IS NULL;
