import { TRANSACTIONAL_CATALOG_TEMPLATES } from './catalog/catalog-transactional-print';
import type { CatalogTemplateDef } from './catalog/document-catalog.types';

/** Auto-linked on seed / new hospital — resolved to `document.id` at provision time. */
export const ESSENTIAL_HOSPITAL_PROVISION_TEMPLATES: CatalogTemplateDef[] =
	TRANSACTIONAL_CATALOG_TEMPLATES;
