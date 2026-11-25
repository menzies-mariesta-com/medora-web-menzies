import { describe, expect, it } from 'vitest';
import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
import { buildMlcPrintHtml } from './clinical-form-print.util.svelte';

const schema: ClinicalFormTemplateSchema = {
	sections: [
		{
			id: 'incident',
			type: 'section',
			label: 'Incident',
			sectionFields: [
				{
					id: 'incident_location',
					type: 'text',
					label: 'Place of incident'
				},
				{
					id: 'nature_of_weapon',
					type: 'enum',
					label: 'Nature of weapon',
					options: [{ value: 'blunt', label: 'Blunt' }]
				}
			]
		},
		{
			id: 'examination',
			type: 'section',
			label: 'Examination',
			sectionFields: [
				{
					id: 'exam_injuries',
					type: 'table',
					label: 'Injuries',
					columns: [
						{ id: 'region', label: 'Region', type: 'text' },
						{ id: 'size', label: 'Size', type: 'text' }
					]
				}
			]
		}
	]
};

function build(
	values: Record<string, unknown>,
	signedAt: string | null = null
) {
	return buildMlcPrintHtml({
		formNumber: 'MLC-0001',
		title: 'MLC documentation',
		schema,
		values,
		signedAt,
		printBy: 'Tester'
	});
}

describe('buildMlcPrintHtml', () => {
	it('renders section labels and enum option labels, not raw values', () => {
		const html = build({
			incident_location: 'Bogyoke Road',
			nature_of_weapon: 'blunt'
		});
		expect(html).toContain('Incident');
		expect(html).toContain('Bogyoke Road');
		expect(html).toContain('Blunt');
	});

	it('renders injury rows as a table with one row per entry', () => {
		const html = build({
			exam_injuries: [
				{ region: 'Left forearm', size: '2 cm' },
				{ region: 'Scalp', size: '4 cm' }
			]
		});
		expect(html).toContain('mlc-print-table');
		expect(html).toContain('Left forearm');
		expect(html).toContain('Scalp');
	});

	it('escapes stored values so a record cannot inject markup', () => {
		const html = build({
			incident_location: '<script>alert(1)</script>',
			exam_injuries: [
				{ region: '<img src=x onerror=alert(1)>', size: '' }
			]
		});
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).not.toContain('<img src=x');
		expect(html).toContain('&lt;script&gt;');
	});

	it('marks an unsigned draft as not a legal record', () => {
		const html = build({ incident_location: 'X' }, null);
		expect(html).toContain('Unsigned draft');
	});

	it('prints the addendum reason when present', () => {
		const html = build({
			incident_location: 'X',
			addendum_reason: 'Corrected injury size'
		});
		expect(html).toContain('Corrected injury size');
	});

	it('does not print an empty addendum block', () => {
		const html = build({
			incident_location: 'X',
			addendum_reason: '   '
		});
		expect(html).not.toContain('<h3>Addendum</h3>');
	});

	it('shows a dash for a missing field rather than the string "undefined"', () => {
		const html = build({});
		expect(html).toContain('—');
		expect(html).not.toContain('>undefined<');
	});
});
