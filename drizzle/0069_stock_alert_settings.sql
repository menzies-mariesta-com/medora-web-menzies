-- Stock alert hospital settings, recipients, email dedupe log; per-item expiry lead override.

ALTER TABLE "item_master" ADD COLUMN IF NOT EXISTS "expiry_alert_lead_days" integer;

CREATE TABLE IF NOT EXISTS "inv_stock_alert_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"default_expiring_soon_days" integer DEFAULT 30 NOT NULL,
	"email_low_stock" boolean DEFAULT false NOT NULL,
	"email_expired" boolean DEFAULT false NOT NULL,
	"email_expiring_soon" boolean DEFAULT false NOT NULL,
	"email_min_gap_minutes" integer DEFAULT 360 NOT NULL,
	"in_app_min_gap_minutes" integer DEFAULT 360 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_stock_alert_setting_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_alert_setting_hospital_id_unique" UNIQUE("hospital_id")
);

CREATE TABLE IF NOT EXISTS "inv_stock_alert_recipient" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"notify_low_stock" boolean DEFAULT true NOT NULL,
	"notify_expired" boolean DEFAULT true NOT NULL,
	"notify_expiring_soon" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "inv_stock_alert_recipient_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_alert_recipient_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "inv_stock_alert_recipient_hospital_staff_uidx"
	ON "inv_stock_alert_recipient" ("hospital_id", "staff_id")
	WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "inv_stock_alert_recipient_hospital_idx"
	ON "inv_stock_alert_recipient" ("hospital_id");

CREATE TABLE IF NOT EXISTS "inv_stock_alert_email_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"recipient_staff_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_stock_alert_email_sent_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_alert_email_sent_staff_id_fk" FOREIGN KEY ("recipient_staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "inv_stock_alert_email_sent_lookup_idx"
	ON "inv_stock_alert_email_sent" ("hospital_id", "recipient_staff_id", "event_type", "sent_at" DESC);
