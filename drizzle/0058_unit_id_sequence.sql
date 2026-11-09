-- Seeded unit / unit_type rows use explicit ids and left the serials at 1.
SELECT setval(
	pg_get_serial_sequence('unit', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM unit), 0), 1)
);
SELECT setval(
	pg_get_serial_sequence('unit_type', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM unit_type), 0), 1)
);
