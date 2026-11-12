-- Seeded document_type rows use explicit ids and left the serial behind MAX(id).
SELECT setval(
	pg_get_serial_sequence('document_type', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM document_type), 0), 1)
);
