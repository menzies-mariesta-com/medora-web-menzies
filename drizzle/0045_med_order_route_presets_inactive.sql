-- Global route presets + hospital-scoped inactive rows (same idea as med_order_frequency_inactive).

ALTER TABLE "med_order_route"
	ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "med_order_route_preset_idx"
	ON "med_order_route" ("is_preset")
	WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_route_preset_global_name_uidx"
	ON "med_order_route" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true
		AND "hospital_id" IS NULL;

CREATE TABLE IF NOT EXISTS "med_order_route_inactive" (
	"hospital_id" uuid NOT NULL,
	"route_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_route_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_route_inactive_route_id_med_order_route_id_fk"
		FOREIGN KEY ("route_id") REFERENCES "public"."med_order_route"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_route_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_route_inactive_hospital_route_uidx"
	ON "med_order_route_inactive" ("hospital_id", "route_id");

CREATE INDEX IF NOT EXISTS "med_order_route_inactive_hospital_id_idx"
	ON "med_order_route_inactive" ("hospital_id");

CREATE INDEX IF NOT EXISTS "med_order_route_inactive_route_id_idx"
	ON "med_order_route_inactive" ("route_id");
