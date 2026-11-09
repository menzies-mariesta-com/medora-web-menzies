-- Snapshot formula + inputs on inventory charge lines; copy to billing lines.

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS pricing_formula_template_id integer
		REFERENCES inv_pricing_formula_template (id) ON DELETE RESTRICT;

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS pricing_module varchar(16);

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS pricing_batch_id integer
		REFERENCES item_batch (id) ON DELETE RESTRICT;

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS unit_sale_price_issue decimal(14, 2);

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS pricing_inputs_snapshot jsonb;

ALTER TABLE medication_order_line
	ADD COLUMN IF NOT EXISTS pricing_computed_at timestamptz;

CREATE INDEX IF NOT EXISTS medication_order_line_pricing_formula_template_id_idx
	ON medication_order_line (pricing_formula_template_id);

ALTER TABLE inv_department_consumption_line
	ADD COLUMN IF NOT EXISTS pricing_formula_template_id integer
		REFERENCES inv_pricing_formula_template (id) ON DELETE RESTRICT;

ALTER TABLE inv_department_consumption_line
	ADD COLUMN IF NOT EXISTS pricing_module varchar(16);

ALTER TABLE inv_department_consumption_line
	ADD COLUMN IF NOT EXISTS unit_emp_sale_price_issue decimal(14, 2);

ALTER TABLE inv_department_consumption_line
	ADD COLUMN IF NOT EXISTS pricing_inputs_snapshot jsonb;

ALTER TABLE inv_department_consumption_line
	ADD COLUMN IF NOT EXISTS pricing_computed_at timestamptz;

CREATE INDEX IF NOT EXISTS inv_department_consumption_line_pricing_formula_template_id_idx
	ON inv_department_consumption_line (pricing_formula_template_id);

ALTER TABLE op_billing_line
	ADD COLUMN IF NOT EXISTS pricing_formula_template_id integer;

ALTER TABLE op_billing_line
	ADD COLUMN IF NOT EXISTS pricing_module varchar(16);

ALTER TABLE op_billing_line
	ADD COLUMN IF NOT EXISTS pricing_batch_id integer;

ALTER TABLE op_billing_line
	ADD COLUMN IF NOT EXISTS unit_sale_price_issue decimal(14, 2);

ALTER TABLE op_billing_line
	ADD COLUMN IF NOT EXISTS pricing_inputs_snapshot jsonb;

ALTER TABLE ip_billing_line
	ADD COLUMN IF NOT EXISTS pricing_formula_template_id integer;

ALTER TABLE ip_billing_line
	ADD COLUMN IF NOT EXISTS pricing_module varchar(16);

ALTER TABLE ip_billing_line
	ADD COLUMN IF NOT EXISTS pricing_batch_id integer;

ALTER TABLE ip_billing_line
	ADD COLUMN IF NOT EXISTS unit_sale_price_issue decimal(14, 2);

ALTER TABLE ip_billing_line
	ADD COLUMN IF NOT EXISTS pricing_inputs_snapshot jsonb;
