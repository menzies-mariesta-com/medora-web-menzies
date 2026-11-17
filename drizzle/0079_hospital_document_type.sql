ALTER TABLE "hospital_document" ADD COLUMN IF NOT EXISTS "document_type_id" integer;
--> statement-breakpoint
UPDATE "hospital_document" hd
SET "document_type_id" = d."document_type_id"
FROM "document" d
WHERE d.id = hd."document_id"
	AND hd."document_type_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "hospital_document"
	ADD CONSTRAINT "hospital_document_document_type_id_document_type_id_fk"
	FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id")
	ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "hospital_document" ALTER COLUMN "document_type_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hospital_document_document_type_id_idx"
	ON "hospital_document" ("document_type_id");
--> statement-breakpoint
ALTER TABLE "document" DROP CONSTRAINT IF EXISTS "document_document_type_id_document_type_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "document_document_type_id_idx";
--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN IF EXISTS "document_type_id";
