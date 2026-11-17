-- Letterhead belongs in hospital_document_settings header; body keeps title/meta + dynamic sections.
UPDATE document
SET
	document_text = regexp_replace(
		document_text,
		'<header class="print-doc-header">[\s\S]*?</header>\s*',
		'',
		'gi'
	),
	updated_at = now()
WHERE code IN ('CASE_SHEET_PRINT', 'DISCHARGE_SUMMARY_PRINT')
	AND document_text ~* '<header class="print-doc-header">';