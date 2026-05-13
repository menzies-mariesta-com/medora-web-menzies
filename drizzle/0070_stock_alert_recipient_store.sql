-- Stock alert recipients scoped per store; email dedupe includes store.

DELETE FROM "inv_stock_alert_email_sent";

DROP INDEX IF EXISTS "inv_stock_alert_email_sent_lookup_idx";

ALTER TABLE "inv_stock_alert_email_sent"
	ADD COLUMN "store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "inv_stock_alert_email_sent_lookup_idx"
	ON "inv_stock_alert_email_sent" ("hospital_id", "recipient_staff_id", "store_id", "event_type", "sent_at" DESC);

DELETE FROM "inv_stock_alert_recipient";

DROP INDEX IF EXISTS "inv_stock_alert_recipient_hospital_staff_uidx";

ALTER TABLE "inv_stock_alert_recipient"
	ADD COLUMN "store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "inv_stock_alert_recipient_hospital_store_staff_uidx"
	ON "inv_stock_alert_recipient" ("hospital_id", "store_id", "staff_id")
	WHERE "deleted_at" IS NULL;

CREATE INDEX "inv_stock_alert_recipient_store_idx"
	ON "inv_stock_alert_recipient" ("hospital_id", "store_id");
