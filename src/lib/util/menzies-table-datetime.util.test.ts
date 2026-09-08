import { describe, expect, it } from 'vitest';
import { formatMenziesTableDateTime } from './menzies-table-datetime.util';

describe('formatMenziesTableDateTime', () => {
	it('returns em dash for empty values', () => {
		expect(formatMenziesTableDateTime(null)).toBe('—');
		expect(formatMenziesTableDateTime('')).toBe('—');
	});

	it('formats valid ISO timestamps with short date and time', () => {
		const out = formatMenziesTableDateTime('2025-06-25T14:30:00.000Z');
		expect(out).not.toContain('T');
		expect(out).toMatch(/\d/);
	});

	it('uses the same style for created and updated values', () => {
		const created = formatMenziesTableDateTime('2025-06-25T08:00:00.000Z');
		const updated = formatMenziesTableDateTime('2025-06-25T09:15:00.000Z');
		expect(created.split(', ').length).toBe(updated.split(', ').length);
	});
});
