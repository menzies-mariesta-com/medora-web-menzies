-- Optional dev data for EMR/CPOE Order page “Service Type” filter (Radiology / Laboratory / Nursing).
-- Prerequisites: run master-table-seed and information-table-seed (includes sub_category ids 90001–90003).
--
-- 1. Replace HOSPITAL_UUID and BRANCH_UUID with your real ids (same hospital/branch as your test visit).
--    Example: SELECT id, name FROM hospital;  SELECT id, name FROM hospital_branch WHERE hospital_id = '...';
-- 2. Run this file in your SQL client.

INSERT INTO service_item (id, hospital_id, sub_category_id, service_name, service_code, status_id)
VALUES
	(90001, 'HOSPITAL_UUID'::uuid, 90001, '[Dev test] CT Head', 'DEV-RAD-CT', 1),
	(90002, 'HOSPITAL_UUID'::uuid, 90002, '[Dev test] IV Line', 'DEV-NUR-IV', 1),
	(90003, 'HOSPITAL_UUID'::uuid, 90003, '[Dev test] CBC', 'DEV-LAB-CBC', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_tagging (branch_id, service_id, valid_date, service_amount, service_tax_amount, allow_edit, status_id)
SELECT 'BRANCH_UUID'::uuid, 90001, NULL, 100.00, 0.00, true, 1
WHERE NOT EXISTS (
	SELECT 1 FROM service_tagging WHERE branch_id = 'BRANCH_UUID'::uuid AND service_id = 90001
);

INSERT INTO service_tagging (branch_id, service_id, valid_date, service_amount, service_tax_amount, allow_edit, status_id)
SELECT 'BRANCH_UUID'::uuid, 90002, NULL, 50.00, 0.00, true, 1
WHERE NOT EXISTS (
	SELECT 1 FROM service_tagging WHERE branch_id = 'BRANCH_UUID'::uuid AND service_id = 90002
);

INSERT INTO service_tagging (branch_id, service_id, valid_date, service_amount, service_tax_amount, allow_edit, status_id)
SELECT 'BRANCH_UUID'::uuid, 90003, NULL, 25.00, 0.00, true, 1
WHERE NOT EXISTS (
	SELECT 1 FROM service_tagging WHERE branch_id = 'BRANCH_UUID'::uuid AND service_id = 90003
);
