import type {
	ClinicalFormFieldDef,
	ClinicalFormTemplateSchema
} from '$lib/model/type/medora/clinical-form.type';

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

export function validateClinicalFormValues(
	schema: ClinicalFormTemplateSchema,
	values: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
	const fields = flattenFields(schema.sections);
	for (const field of fields) {
		const raw = values[field.id];
		if (field.required) {
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
