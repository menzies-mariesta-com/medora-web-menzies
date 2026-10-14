ALTER TABLE "patient" ADD COLUMN IF NOT EXISTS "is_external" boolean DEFAULT false NOT NULL;
