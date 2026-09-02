import { describe, expect, it } from 'vitest';
import { formatMariTableDateTime } from './mari-table-datetime.util';

describe('formatMariTableDateTime', () => {
	it('returns em dash for empty values', () => {
		expect(formatMariTableDateTime(null)).toBe('—');
		expect(formatMariTableDateTime('')).toBe('—');
	});

	it('formats valid ISO timestamps with short date and time', () => {
		const out = formatMariTableDateTime('2025-06-25T14:30:00.000Z');
		expect(out).not.toContain('T');
		expect(out).toMatch(/\d/);
	});

	it('uses the same style for created and updated values', () => {
		const created = formatMariTableDateTime('2025-06-25T08:00:00.000Z');
		const updated = formatMariTableDateTime('2025-06-25T09:15:00.000Z');
		expect(created.split(', ').length).toBe(updated.split(', ').length);
	});
});
