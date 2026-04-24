-- Extend med_order_frequency to support legacy-like fields and protected presets.
ALTER TABLE "med_order_frequency"
	ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "description" text,
	ADD COLUMN IF NOT EXISTS "abbreviation" varchar(64),
	-- Occurrences per day (e.g. Q1MIN = 1440, hourly = 24, BD = 2)
	ADD COLUMN IF NOT EXISTS "frequency_per_day" numeric(18, 6),
	ADD COLUMN IF NOT EXISTS "sequence_no" integer NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "is_common_frequency" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "is_timing_required" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "diff_plot_one_hourly_value" integer,
	ADD COLUMN IF NOT EXISTS "diff_plot_two_hourly_value" integer,
	ADD COLUMN IF NOT EXISTS "diff_plot_half_hourly_value" integer,
	ADD COLUMN IF NOT EXISTS "diff_plot_four_hourly_value" integer,
	ADD COLUMN IF NOT EXISTS "diff_plot_six_hourly_value" integer,
	ADD COLUMN IF NOT EXISTS "variable_dose" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "pictorial_definition" text,
	ADD COLUMN IF NOT EXISTS "is_frequency_infusion" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "local_language" text;

CREATE INDEX IF NOT EXISTS "med_order_frequency_hospital_preset_idx"
	ON "med_order_frequency" ("hospital_id", "is_preset")
	WHERE "deleted_at" IS NULL;

