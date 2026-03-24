-- Notifications for bell dropdown + modal
CREATE TABLE IF NOT EXISTS "notification" (
	"id" serial PRIMARY KEY,
	"recipient_staff_id" uuid NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
	"hospital_id" uuid REFERENCES "hospital"("id") ON DELETE SET NULL,
	"event_type" varchar(64) NOT NULL,
	"severity" varchar(16) NOT NULL DEFAULT 'info',
	"title" text,
	"message" text NOT NULL,
	"link" text,
	"visit_id" integer REFERENCES "patient_visit"("id") ON DELETE SET NULL,
	"refer_history_id" integer REFERENCES "refer_history"("id") ON DELETE SET NULL,
	"read_at" timestamp with time zone,
	"status_id" integer NOT NULL REFERENCES "status"("id") DEFAULT 1,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "user"("id") ON DELETE set null ON UPDATE cascade
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notification_recipient_created_at_idx" ON "notification" ("recipient_staff_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipient_read_at_idx" ON "notification" ("recipient_staff_id", "read_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_hospital_id_idx" ON "notification" ("hospital_id");

