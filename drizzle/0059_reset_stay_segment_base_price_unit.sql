-- Stay segments bill from their own unit snapshots only.
-- Rows written before base_price_unit snapshots existed are reset from the bed's current unit.
UPDATE "ipd_bed_stay_segment" AS s
SET
	"base_price_unit_id_snapshot" = b."base_price_unit_id",
	"base_price_unit_name_snapshot" = u."name",
	"timeline_duration_days_snapshot" = u."timeline_duration_days"
FROM "bed" AS b
INNER JOIN "unit" AS u ON u."id" = b."base_price_unit_id"
WHERE s."bed_id" = b."id"
	AND (
		s."base_price_unit_id_snapshot" IS NULL
		OR s."base_price_unit_name_snapshot" IS NULL
		OR btrim(s."base_price_unit_name_snapshot") = ''
		OR s."timeline_duration_days_snapshot" IS NULL
	);
