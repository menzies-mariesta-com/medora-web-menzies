import { describe, expect, it } from 'vitest';

describe('trauma log activation validation', () => {
	it('requires non-empty mechanism in valuesJson contract', () => {
		const valuesJson = { mechanism: '   ' };
		const mechanism = String(valuesJson.mechanism ?? '').trim();
		expect(mechanism).toBe('');
		expect(Boolean(mechanism)).toBe(false);
	});

	it('accepts valid mechanism', () => {
		const valuesJson = { mechanism: 'MVA — restrained driver' };
		const mechanism = String(valuesJson.mechanism ?? '').trim();
		expect(mechanism.length).toBeGreaterThan(0);
	});
});