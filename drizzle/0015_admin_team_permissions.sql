-- Admin team role + per-page CRUD permissions for invited helpers.
-- Upsert name so legacy seed rows (e.g. "Receptionist" at id 4) become Admin Team.
INSERT INTO "role" ("id", "name", "status_id")
VALUES (4, 'Admin Team', 1)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"status_id" = EXCLUDED."status_id";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_page_permission" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"page_key" varchar(64) NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_page_permission" ADD CONSTRAINT "admin_page_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_page_permission" ADD CONSTRAINT "admin_page_permission_user_page_unique" UNIQUE("user_id","page_key");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_page_permission_user_id_idx" ON "admin_page_permission" USING btree ("user_id");
