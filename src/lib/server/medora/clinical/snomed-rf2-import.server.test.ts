import { describe, expect, it } from 'vitest';
import {
	fsnMatchesClinicalSubset,
	pickSnomedDisplayTerm
} from './snomed-rf2-import.server';

describe('snomed-rf2-import helpers', () => {
	it('matches finding and disorder FSN semantic tags', () => {
		expect(fsnMatchesClinicalSubset('Pain (finding)')).toBe(true);
		expect(fsnMatchesClinicalSubset('Diabetes mellitus (disorder)')).toBe(
			true
		);
		expect(fsnMatchesClinicalSubset('Procedure (procedure)')).toBe(false);
	});

	it('prefers synonym over stripped FSN', () => {
		expect(
			pickSnomedDisplayTerm(
				'Diabetes mellitus (disorder)',
				'Diabetes mellitus'
			)
		).toBe('Diabetes mellitus');
		expect(
			pickSnomedDisplayTerm('Diabetes mellitus (disorder)', null)
		).toBe('Diabetes mellitus');
	});
});
