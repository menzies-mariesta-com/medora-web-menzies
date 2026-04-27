-- Drop JSON config from med_order_frequency (no longer persisted)
ALTER TABLE "med_order_frequency"
	DROP COLUMN IF EXISTS "config";

