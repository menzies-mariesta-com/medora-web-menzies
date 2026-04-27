-- Routes of administration are global; hospital-specific enable/disable is `med_order_route_inactive` only.

DROP INDEX IF EXISTS "med_order_route_hospital_id_idx";

ALTER TABLE "med_order_route"
	DROP CONSTRAINT IF EXISTS "med_order_route_hospital_id_hospital_id_fk";

ALTER TABLE "med_order_route"
	DROP COLUMN IF EXISTS "hospital_id";

-- Recreate preset name uniqueness without referencing hospital_id (see 0045).
DROP INDEX IF EXISTS "med_order_route_preset_global_name_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_route_preset_global_name_uidx"
	ON "med_order_route" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true;
