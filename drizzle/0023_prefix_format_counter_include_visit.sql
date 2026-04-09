-- Optional: include patient visit id in prefix_counter.scope_key (e.g. per-visit service order sequence).
ALTER TABLE "prefix_format" ADD COLUMN IF NOT EXISTS "counter_include_visit" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Match previous ORDER_NO behaviour (sequence per visit).
UPDATE "prefix_format" SET "counter_include_visit" = 1 WHERE "key" = 'ORDER_NO' AND "deleted_at" IS NULL;
