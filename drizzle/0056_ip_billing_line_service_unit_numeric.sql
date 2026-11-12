-- Keep fractional base-price-unit qty (8h of a Day is 0.3333).
-- Existing whole-number rows cast in place; stay segments are not rewritten.
ALTER TABLE "ip_billing_line"
	ALTER COLUMN "service_unit" TYPE numeric(18, 4)
	USING "service_unit"::numeric(18, 4);
