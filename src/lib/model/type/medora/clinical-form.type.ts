/** Field definition stored in `clinical_form_template.schema_json`. */
export type ClinicalFormFieldDef = {
	id: string;
	type:
		| 'text'
		| 'textarea'
		| 'number'
		| 'enum'
		| 'boolean'
		| 'datetime'
		| 'section'
		| 'signature'
		| 'witness_signature'
		| 'signature_datetime';
	label: string;
	required?: boolean;
	options?: { value: string; label: string }[];
	sectionFields?: ClinicalFormFieldDef[];
};

export type ClinicalFormTemplateSchema = {
	sections: ClinicalFormFieldDef[];
};

export type ClinicalFormTemplateRow = {
	id: number;
	code: string;
	version: number;
	title: string;
	schemaJson: ClinicalFormTemplateSchema;
};

export type ClinicalFormInstanceRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string;
	visitId: string;
	surgicalCaseId: number | null;
	templateId: number;
	templateCode: string | null;
	templateTitle: string | null;
	contextType: string;
	valuesJson: Record<string, unknown>;
	statusTaggingId: number | null;
	signedAt: string | null;
	signedBy: string | null;
	createdAt: string;
	updatedAt: string;
};
