CREATE TABLE IF NOT EXISTS "trial_otp" (
	"email" varchar(256) PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trial_otp_expires_at_idx" ON "trial_otp" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_kind" varchar(16) NOT NULL,
	"pricing_tier" varchar(32),
	"trial_duration" varchar(8),
	"first_name" varchar(128) NOT NULL,
	"last_name" varchar(128) NOT NULL,
	"hospital_name" varchar(512) NOT NULL,
	"website" varchar(512),
	"email" varchar(256) NOT NULL,
	"message" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_request_status_idx" ON "plan_request" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_request_email_idx" ON "plan_request" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_request_created_at_idx" ON "plan_request" USING btree ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_entitlement" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"pricing_tier" varchar(32) NOT NULL,
	"billing_mode" varchar(16) NOT NULL,
	"trial_duration" varchar(8),
	"started_at" timestamp with time zone NOT NULL,
	"renew_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"source_plan_request_id" uuid,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_entitlement_owner_id_idx" ON "owner_entitlement" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_entitlement_status_idx" ON "owner_entitlement" USING btree ("status");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_request" ADD CONSTRAINT "plan_request_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_entitlement" ADD CONSTRAINT "owner_entitlement_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_entitlement" ADD CONSTRAINT "owner_entitlement_source_plan_request_id_plan_request_id_fk" FOREIGN KEY ("source_plan_request_id") REFERENCES "public"."plan_request"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_entitlement" ADD CONSTRAINT "owner_entitlement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_entitlement" ADD CONSTRAINT "owner_entitlement_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
