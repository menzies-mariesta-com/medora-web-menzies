-- Document master: retire catalog-era rows and align hospital_document with global document.id identity.

DROP TABLE IF EXISTS document_catalog;
--> statement-breakpoint

-- Point hospital links at the canonical global row (print/clinical code) when a CATALOG_* stub duplicates it.
UPDATE hospital_document hd
SET document_id = canon.id,
	updated_at = now()
FROM document stub
JOIN document canon
	ON canon.document_number = stub.document_number
	AND canon.locale = stub.locale
	AND canon.id <> stub.id
	AND canon.code IS NOT NULL
	AND canon.code NOT LIKE 'CATALOG\_%' ESCAPE '\'
WHERE stub.id = hd.document_id
	AND stub.code LIKE 'CATALOG\_%' ESCAPE '\'
	AND NOT EXISTS (
		SELECT 1
		FROM hospital_document x
		WHERE x.hospital_id = hd.hospital_id
			AND x.document_id = canon.id
	);
--> statement-breakpoint

DELETE FROM hospital_document a
USING hospital_document b
WHERE a.hospital_id = b.hospital_id
	AND a.document_id = b.document_id
	AND a.id > b.id;
--> statement-breakpoint

DELETE FROM document stub
WHERE stub.code LIKE 'CATALOG\_%' ESCAPE '\'
	AND NOT EXISTS (SELECT 1 FROM hospital_document hd WHERE hd.document_id = stub.id)
	AND NOT EXISTS (SELECT 1 FROM patient_document pd WHERE pd.document_id = stub.id);
--> statement-breakpoint

UPDATE document
SET code = NULL,
	updated_at = now()
WHERE code IS NOT NULL
	AND code LIKE 'CATALOG\_%' ESCAPE '\';
--> statement-breakpoint

UPDATE hospital_document hd
SET document_type_id = mapped.type_id,
	updated_at = now()
FROM document d
CROSS JOIN LATERAL (
	SELECT CASE d.code
		WHEN 'BILL_PRINT' THEN 2
		WHEN 'OP_BILL_PRINT' THEN 2
		WHEN 'IP_BILL_PRINT' THEN 2
		WHEN 'NURSING_COMPLETE_PRINT' THEN 3
		WHEN 'CASE_SHEET_PRINT' THEN 4
		WHEN 'DISCHARGE_SUMMARY_PRINT' THEN 5
		WHEN 'MED_ORDER_RECEIPT_PRINT' THEN 6
		WHEN 'APPOINTMENT_SLIP_PRINT' THEN 7
		WHEN 'VISIT_LABEL_PRINT' THEN 8
		WHEN 'IPD_WRISTBAND_PRINT' THEN 9
		ELSE NULL
	END AS type_id
) mapped
WHERE d.id = hd.document_id
	AND mapped.type_id IS NOT NULL
	AND hd.document_type_id IS DISTINCT FROM mapped.type_id;
--> statement-breakpoint

UPDATE hospital_document hd
SET document_type_id = 1,
	updated_at = now()
FROM document d
WHERE d.id = hd.document_id
	AND d.clinical_section IS NOT NULL
	AND trim(d.clinical_section) <> ''
	AND hd.document_type_id IS DISTINCT FROM 1;
--> statement-breakpoint

UPDATE hospital_document hd
SET locale = d.locale,
	updated_at = now()
FROM document d
WHERE d.id = hd.document_id
	AND hd.locale IS DISTINCT FROM d.locale;
--> statement-breakpoint

DELETE FROM hospital_document hd
WHERE NOT EXISTS (SELECT 1 FROM document d WHERE d.id = hd.document_id);
--> statement-breakpoint

DELETE FROM patient_document pd
WHERE NOT EXISTS (SELECT 1 FROM document d WHERE d.id = pd.document_id);
