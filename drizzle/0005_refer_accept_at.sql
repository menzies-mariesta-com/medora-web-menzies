-- Accept timestamp (date-only accept_date retained for compatibility)
ALTER TABLE "refer_history" ADD COLUMN IF NOT EXISTS "accept_at" timestamp with time zone;
