ALTER TABLE "item_master" ADD COLUMN "barcode" varchar(128);--> statement-breakpoint
CREATE INDEX "item_master_barcode_idx" ON "item_master" USING btree ("barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "item_master_barcode_unique" ON "item_master" USING btree ("barcode") WHERE "barcode" IS NOT NULL;
