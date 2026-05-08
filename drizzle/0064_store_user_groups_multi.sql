-- Replace store -> single user_group / department XOR with a multi-user-group junction.
-- Drops the legacy single-link columns on `store` and introduces `store_user_group`.

ALTER TABLE "store" DROP CONSTRAINT IF EXISTS "store_user_group_xor_department_chk";
--> statement-breakpoint
ALTER TABLE "store" DROP CONSTRAINT IF EXISTS "store_user_group_id_user_group_id_fk";
--> statement-breakpoint
ALTER TABLE "store" DROP CONSTRAINT IF EXISTS "store_department_id_department_id_fk";
--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN IF EXISTS "user_group_id";
--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN IF EXISTS "department_id";
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "store_user_group" (
	"store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE cascade,
	"user_group_id" integer NOT NULL REFERENCES "user_group"("id") ON DELETE restrict,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text REFERENCES "user"("id") ON DELETE set null,
	"updated_by" text REFERENCES "user"("id") ON DELETE set null,
	CONSTRAINT "store_user_group_pk" PRIMARY KEY ("store_id", "user_group_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_user_group_user_group_idx"
	ON "store_user_group" ("user_group_id");
