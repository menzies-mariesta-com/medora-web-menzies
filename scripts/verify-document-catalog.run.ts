import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import { getAllCatalogTemplates } from '$lib/server/medora/document-master/catalog/document-catalog.index';
import { DOCUMENT_TEMPLATE_PLACEHOLDERS } from '$lib/util/document-placeholder.util';

const MIN_TEMPLATES = 280;
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

const allowed = new Set<string>();
for (const group of DOCUMENT_TEMPLATE_PLACEHOLDERS) {
	for (const p of group.placeholders) {
		allowed.add(p.key);
	}
}
// Print pipeline injects structured HTML blocks.
allowed.add('{{print.body_html}}');

function collectPlaceholders(html: string): string[] {
	return [...html.matchAll(PLACEHOLDER_RE)].map((m) => m[0]);
}

function main(): void {
	const templates = getAllCatalogTemplates();
	const errors: string[] = [];

	if (templates.length < MIN_TEMPLATES) {
		errors.push(
			`Expected at least ${MIN_TEMPLATES} catalog templates, got ${templates.length}`
		);
	}

	const codes = new Set<string>();
	for (const tpl of templates) {
		if (!tpl.catalogCode?.trim()) {
			errors.push('Template missing catalogCode');
			continue;
		}
		if (codes.has(tpl.catalogCode)) {
			errors.push(`Duplicate catalogCode: ${tpl.catalogCode}`);
		}
		codes.add(tpl.catalogCode);

		if (!tpl.title?.trim()) {
			errors.push(`${tpl.catalogCode}: empty title`);
		}

		const en = tpl.locales.find((l) => l.locale === 'en');
		if (!en) {
			errors.push(`${tpl.catalogCode}: missing en locale`);
		} else if (
			tpl.kind !== DocumentCatalogKindEnum.TRANSACTIONAL_PRINT &&
			!en.documentText?.trim() &&
			!tpl.legacyDocumentId
		) {
			errors.push(`${tpl.catalogCode}: empty en documentText`);
		}

		for (const loc of tpl.locales) {
			if (
				tpl.kind === DocumentCatalogKindEnum.TRANSACTIONAL_PRINT &&
				!loc.documentText &&
				tpl.legacyDocumentId
			) {
				continue;
			}
			const text = loc.documentText ?? '';
			for (const ph of collectPlaceholders(text)) {
				if (!allowed.has(ph)) {
					errors.push(`${tpl.catalogCode} (${loc.locale}): unknown placeholder ${ph}`);
				}
			}
		}
	}

	if (errors.length > 0) {
		console.error('Document catalog verification failed:\n');
		for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
		if (errors.length > 50) {
			console.error(`  ... and ${errors.length - 50} more`);
		}
		process.exit(1);
	}

	console.log(
		`Document catalog OK: ${templates.length} templates, placeholders validated.`
	);
}

main();
