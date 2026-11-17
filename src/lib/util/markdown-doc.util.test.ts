import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown-doc.util';

describe('markdownToHtml heading ids', () => {
	it('adds stable ids on h2 and h3 for TOC', () => {
		const html = markdownToHtml('## First\n\n### Nested\n\n## First\n');
		expect(html).toContain('id="first"');
		expect(html).toContain('id="nested"');
		expect(html).toContain('id="first-1"');
	});
});
