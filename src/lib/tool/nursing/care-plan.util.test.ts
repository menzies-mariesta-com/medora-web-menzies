import { describe, expect, it } from 'vitest';
import {
	mergeCarePlanDefaults,
	parseInterventionLines,
	readCarePlanContent
} from '$lib/tool/nursing/care-plan.util';

describe('parseInterventionLines', () => {
	it('drops blank lines and trims each one', () => {
		expect(parseInterventionLines('  a  \n\n\t b \n   \nc')).toEqual([
			'a',
			'b',
			'c'
		]);
	});

	it('returns nothing for empty, null, or undefined input', () => {
		expect(parseInterventionLines('')).toEqual([]);
		expect(parseInterventionLines(null)).toEqual([]);
		expect(parseInterventionLines(undefined)).toEqual([]);
	});

	it('keeps a single line intact', () => {
		expect(
			parseInterventionLines('Reposition every 2 hours')
		).toEqual(['Reposition every 2 hours']);
	});
});

describe('mergeCarePlanDefaults', () => {
	const schema = {
		sections: [],
		defaults: {
			problem: 'Fall risk',
			goal: 'No falls',
			interventions: 'a\nb'
		}
	};

	it('returns defaults when the user has typed nothing', () => {
		expect(mergeCarePlanDefaults(schema, {})).toEqual(
			schema.defaults
		);
	});

	it('lets a non-empty user value override the default', () => {
		expect(
			mergeCarePlanDefaults(schema, { goal: 'No falls by discharge' })
		).toEqual({
			problem: 'Fall risk',
			goal: 'No falls by discharge',
			interventions: 'a\nb'
		});
	});

	it('keeps the default when the user value is blank', () => {
		expect(mergeCarePlanDefaults(schema, { goal: '   ' })).toEqual(
			schema.defaults
		);
	});

	it('tolerates a missing schema', () => {
		expect(mergeCarePlanDefaults(null, { goal: 'x' })).toEqual({
			goal: 'x'
		});
	});
});

describe('readCarePlanContent', () => {
	it('keeps only the four known fields', () => {
		expect(
			readCarePlanContent({
				problem: 'p',
				goal: 'g',
				interventions: 'i',
				evaluation: 'e',
				patientId: 'evil',
				admin: true
			})
		).toEqual({
			ok: true,
			content: {
				problem: 'p',
				goal: 'g',
				interventions: 'i',
				evaluation: 'e'
			}
		});
	});

	it('drops non-string values rather than coercing them', () => {
		expect(readCarePlanContent({ problem: 'p', goal: 42 })).toEqual({
			ok: true,
			content: { problem: 'p' }
		});
	});

	it('rejects anything that is not a plain object', () => {
		expect(readCarePlanContent(null).ok).toBe(false);
		expect(readCarePlanContent('text').ok).toBe(false);
		expect(readCarePlanContent(['a']).ok).toBe(false);
	});
});
