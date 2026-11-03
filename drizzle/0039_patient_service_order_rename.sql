-- Rename clinical service order tables to patient_* naming.
ALTER TABLE "service_order" RENAME TO "patient_service_order";
--> statement-breakpoint
ALTER TABLE "service_order_detail" RENAME TO "patient_service_order_detail";
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.service_order_id_seq') IS NOT NULL THEN
		ALTER SEQUENCE "service_order_id_seq" RENAME TO "patient_service_order_id_seq";
	END IF;
	IF to_regclass('public.service_order_detail_id_seq') IS NOT NULL THEN
		ALTER SEQUENCE "service_order_detail_id_seq" RENAME TO "patient_service_order_detail_id_seq";
	END IF;
END $$;
