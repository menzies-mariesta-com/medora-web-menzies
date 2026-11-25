import { describe, expect, it } from 'vitest';
import {
	buildCarePlanPrintHtml,
	escapeCarePlanHtml
} from '$lib/tool/nursing/care-plan-print.util';

const patient = { name: 'Daw Mya', code: 'P-001', visitNo: 'V-9' };

describe('buildCarePlanPrintHtml', () => {
	it('numbers each intervention line', () => {
		const html = buildCarePlanPrintHtml({
			patient,
			title: 'Risk for falls',
			content: { interventions: 'One\nTwo\n\nThree' }
		});
		expect(html).toContain('<li>One</li>');
		expect(html).toContain('<li>Three</li>');
		expect(html).not.toContain('<li></li>');
	});

	it('escapes user content instead of emitting markup', () => {
		const html = buildCarePlanPrintHtml({
			patient,
			title: 'Pain',
			content: {
				problem: '<img src=x onerror=alert(1)>',
				goal: 'a & b'
			}
		});
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img');
		expect(html).toContain('a &amp; b');
	});

	it('marks an unsigned plan and shows who signed a signed one', () => {
		const unsigned = buildCarePlanPrintHtml({
			patient,
			title: 'Pain',
			content: {}
		});
		expect(unsigned).toContain('Not signed');
		const signed = buildCarePlanPrintHtml({
			patient,
			title: 'Pain',
			content: {},
			signedAt: '2026-11-24T06:00:00.000Z',
			signedByName: 'Nurse A'
		});
		expect(signed).toContain('Nurse A');
		expect(signed).toContain('2026-11-24T06:00:00.000Z');
	});

	it('renders an em dash for a missing field', () => {
		const html = buildCarePlanPrintHtml({
			patient,
			title: 'Pain',
			content: {}
		});
		expect(html).toContain('&ndash;');
	});
});

describe('escapeCarePlanHtml', () => {
	it('escapes the four dangerous characters', () => {
		expect(escapeCarePlanHtml('<a href="x">&</a>')).toBe(
			'&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'
		);
	});
});
