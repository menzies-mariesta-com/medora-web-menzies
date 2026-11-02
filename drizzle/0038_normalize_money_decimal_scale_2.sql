-- Backfill: round all money-like numeric(*/decimal(*,2)) columns to scale 2.
-- Safe to re-run (idempotent when values already at 2 dp).

-- Vitals (clinical measurements, 2 dp)
UPDATE patient_diagnosis SET
  height = round(height, 2),
  weight = round(weight, 2),
  bp_systolic = round(bp_systolic, 2),
  bp_diastolic = round(bp_diastolic, 2),
  pulse = round(pulse, 2),
  temperature = round(temperature, 2),
  sp_o2 = round(sp_o2, 2),
  respiration = round(respiration, 2),
  rbs = round(rbs, 2),
  bmi = round(bmi, 2)
WHERE height IS NOT NULL OR weight IS NOT NULL OR bp_systolic IS NOT NULL
   OR bp_diastolic IS NOT NULL OR pulse IS NOT NULL OR temperature IS NOT NULL
   OR sp_o2 IS NOT NULL OR respiration IS NOT NULL OR rbs IS NOT NULL OR bmi IS NOT NULL;

UPDATE item_master SET item_markup_percent = round(item_markup_percent, 2);

UPDATE service_tagging SET
  service_amount = round(service_amount, 2),
  service_tax_amount = round(service_tax_amount, 2)
WHERE service_amount IS NOT NULL OR service_tax_amount IS NOT NULL;

UPDATE service_order_detail SET
  discount = round(discount, 2),
  service_amount = round(service_amount, 2),
  service_tax_amount = round(service_tax_amount, 2)
WHERE discount IS NOT NULL OR service_amount IS NOT NULL OR service_tax_amount IS NOT NULL;

UPDATE op_billing SET
  lines_subtotal = round(lines_subtotal, 2),
  discount_percent = round(discount_percent, 2),
  discount_amount = round(discount_amount, 2),
  total_amount = round(total_amount, 2);

UPDATE op_billing_line SET
  discount = round(discount, 2),
  service_amount = round(service_amount, 2),
  service_tax_amount = round(service_tax_amount, 2),
  line_total = round(line_total, 2);

UPDATE store SET store_markup_percent = round(store_markup_percent, 2);

UPDATE ward_category SET ward_markup = round(ward_markup, 2);
UPDATE room_category SET room_markup = round(room_markup, 2);
UPDATE bed SET base_price = round(base_price, 2) WHERE base_price IS NOT NULL;

UPDATE ipd_bed_stay_segment SET
  bed_base_price_snapshot = round(bed_base_price_snapshot, 2),
  room_markup_snapshot = round(room_markup_snapshot, 2),
  ward_markup_snapshot = round(ward_markup_snapshot, 2),
  daily_tariff_snapshot = round(daily_tariff_snapshot, 2);

UPDATE ip_billing SET
  lines_subtotal = round(lines_subtotal, 2),
  discount_percent = round(discount_percent, 2),
  discount_amount = round(discount_amount, 2),
  total_amount = round(total_amount, 2),
  advance_applied_amount = round(advance_applied_amount, 2),
  amount_paid = round(amount_paid, 2);

UPDATE ip_billing_line SET
  discount = round(discount, 2),
  service_amount = round(service_amount, 2),
  service_tax_amount = round(service_tax_amount, 2),
  line_total = round(line_total, 2);

UPDATE ip_advance_deposit SET amount = round(amount, 2);

-- Inventory money (scale 2)
UPDATE purchase_order SET total_amount = round(total_amount, 2) WHERE total_amount IS NOT NULL;

UPDATE purchase_order_line SET
  unit_price = round(unit_price, 2),
  line_total = round(line_total, 2)
WHERE unit_price IS NOT NULL OR line_total IS NOT NULL;

UPDATE goods_receipt_note SET
  invoice_amount = round(invoice_amount, 2),
  invoice_discount_amount = round(invoice_discount_amount, 2),
  invoice_discount_percent = round(invoice_discount_percent, 2),
  invoice_tax_amount = round(invoice_tax_amount, 2),
  invoice_tax_percent = round(invoice_tax_percent, 2)
WHERE invoice_amount IS NOT NULL OR invoice_discount_amount IS NOT NULL
   OR invoice_discount_percent IS NOT NULL OR invoice_tax_amount IS NOT NULL
   OR invoice_tax_percent IS NOT NULL;

UPDATE goods_receipt_line SET
  purchase_price = round(purchase_price, 2),
  discount_amount = round(discount_amount, 2),
  discount_percent = round(discount_percent, 2),
  tax_amount = round(tax_amount, 2),
  tax_percent = round(tax_percent, 2)
WHERE purchase_price IS NOT NULL OR discount_amount IS NOT NULL
   OR discount_percent IS NOT NULL OR tax_amount IS NOT NULL OR tax_percent IS NOT NULL;

UPDATE inv_department_consumption_line SET
  emp_sale_price = round(emp_sale_price, 2)
WHERE emp_sale_price IS NOT NULL;

UPDATE inv_pricing_formula_template SET
  msl_markup_percent = round(msl_markup_percent, 2)
WHERE msl_markup_percent IS NOT NULL;

-- Medication order payments
UPDATE medication_order_batch_payment SET
  amount_due = round(amount_due, 2),
  amount_paid = round(amount_paid, 2);

UPDATE medication_order_line SET
  unit_sale_price = round(unit_sale_price, 2)
WHERE unit_sale_price IS NOT NULL;
