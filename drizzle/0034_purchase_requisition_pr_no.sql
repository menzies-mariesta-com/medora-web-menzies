-- Add PR No to purchase requisition (Prefix Configuration driven).
-- Note: keep nullable for existing rows; new PRs will set it.

ALTER TABLE "purchase_requisition"
ADD COLUMN IF NOT EXISTS "pr_no" varchar(128);

-- Enforce uniqueness per hospital when present.
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisition_hospital_pr_no_uidx"
ON "purchase_requisition" ("hospital_id", "pr_no")
WHERE "pr_no" IS NOT NULL;

-- Helpful lookup index (optional; kept non-unique).
CREATE INDEX IF NOT EXISTS "purchase_requisition_pr_no_idx"
ON "purchase_requisition" ("pr_no");

