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

export function buildClinicalFormInstancePrintHtml(input: {
	title: string;
	schema: ClinicalFormTemplateSchema;
	values: Record<string, unknown>;
	signedAt?: string | null;
}): string {
	const fields = flattenFields(input.schema.sections);
	const rows = fields
		.map((f) => {
			const v = input.values[f.id];
			const display =
				v === true
					? 'Yes'
					: v === false
						? 'No'
						: v == null || v === ''
							? '–'
							: String(v);
			return `<tr><th style="text-align:left;padding:4px 8px;">${escapeHtml(f.label)}</th><td style="padding:4px 8px;">${escapeHtml(display)}</td></tr>`;
		})
		.join('');
	const signed = input.signedAt
		? `<p><small>Signed: ${escapeHtml(input.signedAt)}</small></p>`
		: '';
	return `<article><h2>${escapeHtml(input.title)}</h2>${signed}<table style="border-collapse:collapse;width:100%;">${rows}</table></article>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
