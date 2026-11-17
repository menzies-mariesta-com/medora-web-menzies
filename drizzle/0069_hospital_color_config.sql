CREATE TABLE IF NOT EXISTS "hospital_color_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"category" varchar(64) NOT NULL,
	"entity_key" varchar(128) NOT NULL,
	"color" varchar(32) NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"deleted_at" timestamptz
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_color_config" ADD CONSTRAINT "hospital_color_config_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_color_config_hospital_cat_key_uidx" ON "hospital_color_config" USING btree ("hospital_id","category","entity_key") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_color_config_hospital_id_idx" ON "hospital_color_config" USING btree ("hospital_id");