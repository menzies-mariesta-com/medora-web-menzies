-- IP + ED stay billing; not IPD-only.
ALTER TABLE "ipd_accommodation_billing_policy" RENAME TO "accommodation_billing_policy";

ALTER INDEX IF EXISTS "ipd_accommodation_billing_policy_hospital_care_uidx"
	RENAME TO "accommodation_billing_policy_hospital_care_uidx";
