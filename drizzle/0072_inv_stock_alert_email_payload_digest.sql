-- Email dedupe: skip repeat sends within cooldown only when plain-text body is unchanged.

ALTER TABLE "inv_stock_alert_email_sent"
	ADD COLUMN IF NOT EXISTS "payload_digest" varchar(32);
