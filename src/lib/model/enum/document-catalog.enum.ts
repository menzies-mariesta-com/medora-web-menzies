export enum DocumentCatalogKindEnum {
	HTML_PRINT = 'html_print',
	TRANSACTIONAL_PRINT = 'transactional_print',
	STRUCTURED_FORM = 'structured_form'
}

export enum DocumentCatalogCategoryEnum {
	REGISTRATION = 'registration',
	CONSENT_CLINICAL = 'consent_clinical',
	CONSENT_PROCEDURE = 'consent_procedure',
	NURSING = 'nursing',
	EMERGENCY = 'emergency',
	PERIOPERATIVE = 'perioperative',
	OBSTETRICS = 'obstetrics',
	DIAGNOSTICS = 'diagnostics',
	PHARMACY = 'pharmacy',
	CERTIFICATES = 'certificates',
	FINANCE = 'finance',
	HR = 'hr',
	ADMIN_LEGAL = 'admin_legal',
	TRANSACTIONAL = 'transactional'
}

export enum DocumentCatalogSurfaceEnum {
	EMR_CLINICAL = 'emr_clinical',
	ADMIN_ONLY = 'admin_only',
	PRINT_ONLY = 'print_only'
}

export enum DocumentCatalogLocaleEnum {
	EN = 'en',
	MY = 'my'
}
