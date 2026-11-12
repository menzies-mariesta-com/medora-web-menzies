-- IP and ED each get their own accommodation billing policy row.
ALTER TABLE "ipd_accommodation_billing_policy"
	ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IP';

UPDATE "ipd_accommodation_billing_policy"
SET "care_setting" = 'IP'
WHERE "care_setting" IS NULL OR trim("care_setting") = '';

DROP INDEX IF EXISTS "ipd_accommodation_billing_policy_hospital_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "ipd_accommodation_billing_policy_hospital_care_uidx"
	ON "ipd_accommodation_billing_policy" ("hospital_id", "care_setting");
