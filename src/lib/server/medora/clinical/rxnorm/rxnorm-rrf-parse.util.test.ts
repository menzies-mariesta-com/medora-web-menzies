import { describe, expect, it } from 'vitest';
import {
	normalizeRxnormName,
	parseRxnConsoLine,
	parseRxnRelLine
} from './rxnorm-rrf-parse.util';

describe('rxnorm RRF parse', () => {
	it('parses RXNCONSO sample line', () => {
		const line =
			'1191|ENG|S|L123|PF|S123|Y|123| | | |RXNORM|IN|1191|Aspirin| |N| |';
		const row = parseRxnConsoLine(line);
		expect(row?.rxcui).toBe('1191');
		expect(row?.tty).toBe('IN');
		expect(row?.str).toBe('Aspirin');
	});

	it('parses RXNREL has_ingredient', () => {
		const line =
			'213269|123|A|has_ingredient|1191|456|A|has_ingredient|789| |RXNORM|RXNORM| | |N| |';
		const row = parseRxnRelLine(line);
		expect(row?.rxcui1).toBe('213269');
		expect(row?.rxcui2).toBe('1191');
		expect(row?.rela).toBe('has_ingredient');
	});

	it('normalizes names for search', () => {
		expect(normalizeRxnormName('Acetaminophen 500 MG Oral Tablet')).toBe(
			'acetaminophen 500 mg oral tablet'
		);
	});
});
