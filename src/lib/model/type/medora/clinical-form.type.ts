/** Column of a `table` field. Cells store strings in `valuesJson`. */
export type ClinicalFormTableColumn = {
	id: string;
	label: string;
	type: 'text' | 'number' | 'enum';
	options?: { value: string; label: string }[];
};

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
		| 'table'
		| 'signature'
		| 'witness_signature'
		| 'signature_datetime';
	label: string;
	required?: boolean;
	options?: { value: string; label: string }[];
	sectionFields?: ClinicalFormFieldDef[];
	/** Repeating rows, stored as `Record<columnId, string>[]` in the values blob. */
	columns?: ClinicalFormTableColumn[];
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
	/** Legal register number for registered forms (MLC); null otherwise. */
	formNumber: string | null;
	/** Signed original this row amends, when it is an addendum. */
	parentInstanceId: number | null;
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
