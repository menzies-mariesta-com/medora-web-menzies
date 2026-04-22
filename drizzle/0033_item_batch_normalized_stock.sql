-- Normalized item_batch + inv_stock; item_master.is_batch_required; GRN line batch_id + purchase_price.
-- Requires PostgreSQL 15+ for NULLS NOT DISTINCT on item_batch identity index.

CREATE TABLE IF NOT EXISTS "item_batch" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"batch_no" varchar(128) NOT NULL,
	"expiry_date" date,
	"manufacturer_id" integer,
	"supplier_id" integer,
	"purchase_price" numeric(14, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_batch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "item_batch_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "item_batch_manufacturer_id_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturer"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "item_batch_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "item_batch_identity_uidx" ON "item_batch" (
	"hospital_id",
	"item_id",
	"batch_no",
	"expiry_date",
	"supplier_id",
	"manufacturer_id",
	"purchase_price"
) NULLS NOT DISTINCT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_batch_hospital_item_idx" ON "item_batch" ("hospital_id","item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_batch_expiry_idx" ON "item_batch" ("expiry_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_stock_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_store_item_idx" ON "inv_stock" ("store_id","item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_batch_idx" ON "inv_stock" ("batch_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_stock_store_batch_active_uidx" ON "inv_stock" ("store_id","batch_id") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "item_master" ADD COLUMN IF NOT EXISTS "is_batch_required" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "batch_id" integer;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "purchase_price" numeric(14, 4);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_line_batch_id_item_batch_id_fk'
	) THEN
		ALTER TABLE "goods_receipt_line"
			ADD CONSTRAINT "goods_receipt_line_batch_id_item_batch_id_fk"
			FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
INSERT INTO "item_batch" (
	"hospital_id",
	"item_id",
	"batch_no",
	"expiry_date",
	"manufacturer_id",
	"supplier_id",
	"purchase_price",
	"created_at"
)
SELECT
	isl."hospital_id",
	isl."item_id",
	COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__') AS bn,
	isl."expiry_date",
	pol."manufacturer_id",
	po."supplier_id",
	COALESCE(pol."unit_price"::numeric(14, 4), 0::numeric(14, 4)) AS pp,
	MIN(COALESCE(isl."created_at"::timestamptz, now()))
FROM "inv_stock_lot" isl
LEFT JOIN "goods_receipt_line" grl ON grl."id" = isl."grn_line_id" AND grl."deleted_at" IS NULL
LEFT JOIN "goods_receipt_note" grn ON grn."id" = grl."grn_id" AND grn."deleted_at" IS NULL
LEFT JOIN "purchase_order" po ON po."id" = grn."po_id"
LEFT JOIN "purchase_order_line" pol ON pol."id" = grl."po_line_id"
WHERE isl."deleted_at" IS NULL
GROUP BY
	isl."hospital_id",
	isl."item_id",
	COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__'),
	isl."expiry_date",
	pol."manufacturer_id",
	po."supplier_id",
	COALESCE(pol."unit_price"::numeric(14, 4), 0::numeric(14, 4))
ON CONFLICT (
	"hospital_id",
	"item_id",
	"batch_no",
	"expiry_date",
	"supplier_id",
	"manufacturer_id",
	"purchase_price"
) DO NOTHING;
--> statement-breakpoint
-- Map each lot row to item_batch id (same identity columns), then aggregate into inv_stock.
INSERT INTO "inv_stock" (
	"hospital_id",
	"item_id",
	"store_id",
	"batch_id",
	"quantity",
	"created_at",
	"updated_at"
)
SELECT
	s."hospital_id",
	s."item_id",
	s."store_id",
	s."batch_id",
	SUM(s."qty")::numeric(18, 6),
	now(),
	now()
FROM (
	SELECT
		isl."hospital_id",
		isl."item_id",
		isl."store_id",
		ib."id" AS "batch_id",
		isl."quantity"::numeric AS "qty"
	FROM "inv_stock_lot" isl
	INNER JOIN "item_batch" ib ON
		ib."hospital_id" = isl."hospital_id"
		AND ib."item_id" = isl."item_id"
		AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
		AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
	LEFT JOIN "goods_receipt_line" grl ON grl."id" = isl."grn_line_id" AND grl."deleted_at" IS NULL
	LEFT JOIN "goods_receipt_note" grn ON grn."id" = grl."grn_id" AND grn."deleted_at" IS NULL
	LEFT JOIN "purchase_order" po ON po."id" = grn."po_id"
	LEFT JOIN "purchase_order_line" pol ON pol."id" = grl."po_line_id"
	WHERE isl."deleted_at" IS NULL
		AND ib."manufacturer_id" IS NOT DISTINCT FROM pol."manufacturer_id"
		AND ib."supplier_id" IS NOT DISTINCT FROM po."supplier_id"
		AND ib."purchase_price" = COALESCE(pol."unit_price"::numeric(14, 4), 0::numeric(14, 4))
) s
GROUP BY s."hospital_id", s."item_id", s."store_id", s."batch_id"
HAVING SUM(s."qty") > 0;
--> statement-breakpoint
-- Fallback: lots whose batch row did not match PO join (e.g. no grn_line) — one batch per lot identity.
INSERT INTO "item_batch" (
	"hospital_id",
	"item_id",
	"batch_no",
	"expiry_date",
	"manufacturer_id",
	"supplier_id",
	"purchase_price",
	"created_at"
)
SELECT DISTINCT
	isl."hospital_id",
	isl."item_id",
	COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__'),
	isl."expiry_date",
	NULL::integer,
	NULL::integer,
	0::numeric(14, 4),
	COALESCE(isl."created_at"::timestamptz, now())
FROM "inv_stock_lot" isl
WHERE isl."deleted_at" IS NULL
	AND NOT EXISTS (
		SELECT 1 FROM "item_batch" ib
		WHERE ib."hospital_id" = isl."hospital_id"
			AND ib."item_id" = isl."item_id"
			AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
			AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
			AND ib."manufacturer_id" IS NULL AND ib."supplier_id" IS NULL AND ib."purchase_price" = 0::numeric(14, 4)
	)
ON CONFLICT (
	"hospital_id",
	"item_id",
	"batch_no",
	"expiry_date",
	"supplier_id",
	"manufacturer_id",
	"purchase_price"
) DO NOTHING;
--> statement-breakpoint
INSERT INTO "inv_stock" (
	"hospital_id",
	"item_id",
	"store_id",
	"batch_id",
	"quantity",
	"created_at",
	"updated_at"
)
SELECT
	isl."hospital_id",
	isl."item_id",
	isl."store_id",
	ib."id",
	isl."quantity"::numeric(18, 6),
	now(),
	now()
FROM "inv_stock_lot" isl
	INNER JOIN "item_batch" ib ON
		ib."hospital_id" = isl."hospital_id"
		AND ib."item_id" = isl."item_id"
		AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
		AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
		AND ib."manufacturer_id" IS NULL AND ib."supplier_id" IS NULL AND ib."purchase_price" = 0::numeric(14, 4)
WHERE isl."deleted_at" IS NULL
	AND NOT EXISTS (
		SELECT 1 FROM "inv_stock" ist
		WHERE ist."store_id" = isl."store_id" AND ist."batch_id" = ib."id" AND ist."deleted_at" IS NULL
	);
--> statement-breakpoint
UPDATE "goods_receipt_line" grl
SET
	"batch_id" = ib."id",
	"purchase_price" = ib."purchase_price"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
LEFT JOIN "goods_receipt_line" grl2 ON grl2."id" = isl."grn_line_id"
LEFT JOIN "goods_receipt_note" grn ON grn."id" = grl2."grn_id"
LEFT JOIN "purchase_order" po ON po."id" = grn."po_id"
LEFT JOIN "purchase_order_line" pol ON pol."id" = grl2."po_line_id"
WHERE isl."grn_line_id" = grl."id"
	AND isl."deleted_at" IS NULL
	AND ib."manufacturer_id" IS NOT DISTINCT FROM pol."manufacturer_id"
	AND ib."supplier_id" IS NOT DISTINCT FROM po."supplier_id"
	AND ib."purchase_price" = COALESCE(pol."unit_price"::numeric(14, 4), 0::numeric(14, 4));
--> statement-breakpoint
UPDATE "goods_receipt_line" grl
SET
	"batch_id" = ib."id",
	"purchase_price" = ib."purchase_price"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
	AND ib."manufacturer_id" IS NULL AND ib."supplier_id" IS NULL AND ib."purchase_price" = 0::numeric(14, 4)
WHERE isl."grn_line_id" = grl."id"
	AND isl."deleted_at" IS NULL
	AND grl."batch_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD COLUMN IF NOT EXISTS "batch_id" integer;
--> statement-breakpoint
UPDATE "inv_store_transfer_line" itl
SET "batch_id" = ib."id"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
WHERE itl."stock_lot_id" = isl."id"
	AND isl."deleted_at" IS NULL;
--> statement-breakpoint
UPDATE "inv_store_transfer_line" itl
SET "batch_id" = ib."id"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
	AND ib."manufacturer_id" IS NULL AND ib."supplier_id" IS NULL AND ib."purchase_price" = 0::numeric(14, 4)
WHERE itl."stock_lot_id" = isl."id"
	AND isl."deleted_at" IS NULL
	AND itl."batch_id" IS NULL;
--> statement-breakpoint
DELETE FROM "inv_store_transfer_line" WHERE "batch_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" DROP CONSTRAINT IF EXISTS "inv_store_transfer_line_stock_lot_id_inv_stock_lot_id_fk";
--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" DROP COLUMN IF EXISTS "stock_lot_id";
--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ALTER COLUMN "batch_id" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'inv_store_transfer_line_batch_id_item_batch_id_fk'
	) THEN
		ALTER TABLE "inv_store_transfer_line"
			ADD CONSTRAINT "inv_store_transfer_line_batch_id_item_batch_id_fk"
			FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD COLUMN IF NOT EXISTS "batch_id" integer;
--> statement-breakpoint
UPDATE "inv_stock_issue_line" iil
SET "batch_id" = ib."id"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
WHERE iil."stock_lot_id" = isl."id"
	AND isl."deleted_at" IS NULL;
--> statement-breakpoint
UPDATE "inv_stock_issue_line" iil
SET "batch_id" = ib."id"
FROM "inv_stock_lot" isl
INNER JOIN "item_batch" ib ON
	ib."hospital_id" = isl."hospital_id"
	AND ib."item_id" = isl."item_id"
	AND ib."batch_no" = COALESCE(NULLIF(trim(isl."batch_no"), ''), '__OPEN_STOCK__')
	AND ib."expiry_date" IS NOT DISTINCT FROM isl."expiry_date"
	AND ib."manufacturer_id" IS NULL AND ib."supplier_id" IS NULL AND ib."purchase_price" = 0::numeric(14, 4)
WHERE iil."stock_lot_id" = isl."id"
	AND isl."deleted_at" IS NULL
	AND iil."batch_id" IS NULL;
--> statement-breakpoint
DELETE FROM "inv_stock_issue_line" WHERE "batch_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" DROP CONSTRAINT IF EXISTS "inv_stock_issue_line_stock_lot_id_inv_stock_lot_id_fk";
--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" DROP COLUMN IF EXISTS "stock_lot_id";
--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ALTER COLUMN "batch_id" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'inv_stock_issue_line_batch_id_item_batch_id_fk'
	) THEN
		ALTER TABLE "inv_stock_issue_line"
			ADD CONSTRAINT "inv_stock_issue_line_batch_id_item_batch_id_fk"
			FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "inv_stock_lot" CASCADE;
--> statement-breakpoint
