import type {
	ClinicalFormFieldDef,
	ClinicalFormTemplateSchema
} from '$lib/model/type/medora/clinical-form.type';

/** Leaf fields, including `table` fields (a table is one field, not flattened). */
function flattenFields(
	sections: ClinicalFormFieldDef[]
): ClinicalFormFieldDef[] {
	const out: ClinicalFormFieldDef[] = [];
	for (const f of sections) {
		if (f.type === 'section' && f.sectionFields?.length) {
			out.push(...flattenFields(f.sectionFields));
		} else if (f.type !== 'section') {
			out.push(f);
		}
	}
	return out;
}

/** Rows of a table value, dropping anything that is not a plain object. */
function tableRowsOf(raw: unknown): Record<string, unknown>[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(
		(row): row is Record<string, unknown> =>
			typeof row === 'object' && row !== null && !Array.isArray(row)
	);
}

/** A row counts as filled when at least one cell holds a non-empty value. */
function rowHasValue(row: Record<string, unknown>): boolean {
	return Object.values(row).some(
		(cell) =>
			cell !== undefined &&
			cell !== null &&
			String(cell).trim() !== ''
	);
}

function validateTableField(
	field: ClinicalFormFieldDef,
	raw: unknown,
	options: { skipRequired?: boolean }
): { ok: true } | { ok: false; message: string } {
	const rows = tableRowsOf(raw).filter(rowHasValue);
	if (field.required && !options.skipRequired && rows.length === 0) {
		return { ok: false, message: `${field.label} is required` };
	}
	const enumColumns = (field.columns ?? []).filter(
		(c) => c.type === 'enum'
	);
	if (enumColumns.length === 0) return { ok: true };

	for (const row of rows) {
		for (const col of enumColumns) {
			const cell = row[col.id];
			if (cell == null || cell === '') continue;
			const allowed = new Set(
				(col.options ?? []).map((o) => o.value)
			);
			if (!allowed.has(String(cell))) {
				return {
					ok: false,
					message: `${field.label}: ${col.label} is invalid`
				};
			}
		}
	}
	return { ok: true };
}

export function validateClinicalFormValues(
	schema: ClinicalFormTemplateSchema,
	values: Record<string, unknown>,
	options: { skipRequired?: boolean } = {}
): { ok: true } | { ok: false; message: string } {
	const fields = flattenFields(schema.sections);
	for (const field of fields) {
		const raw = values[field.id];

		if (field.type === 'table') {
			const result = validateTableField(field, raw, options);
			if (!result.ok) return result;
			continue;
		}

		if (field.required && !options.skipRequired) {
			if (raw === undefined || raw === null || raw === '') {
				return { ok: false, message: `${field.label} is required` };
			}
			if (field.type === 'boolean' && raw !== true && raw !== false) {
				return { ok: false, message: `${field.label} is required` };
			}
		}
		if (field.type === 'enum' && raw != null && raw !== '') {
			const allowed = new Set(
				(field.options ?? []).map((o) => o.value)
			);
			if (!allowed.has(String(raw))) {
				return { ok: false, message: `${field.label} is invalid` };
			}
		}
	}
	return { ok: true };
}
