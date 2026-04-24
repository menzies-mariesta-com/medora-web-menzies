-- Prevent duplicate preset frequency rows per hospital.
-- Uniqueness is enforced by either abbreviation (when present) or label (when abbreviation is null).

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_frequency_preset_global_abbreviation_uidx"
	ON "med_order_frequency" ("abbreviation")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true
		AND "abbreviation" IS NOT NULL
		AND "hospital_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_frequency_preset_global_label_uidx"
	ON "med_order_frequency" ("label")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true
		AND "abbreviation" IS NULL
		AND "hospital_id" IS NULL;

