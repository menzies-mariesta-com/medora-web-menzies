-- better-auth twoFactor plugin: user flag + two_factor secrets/backup codes
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_user_id_idx" ON "two_factor" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_secret_idx" ON "two_factor" ("secret");
