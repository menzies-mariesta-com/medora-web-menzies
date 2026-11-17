import { describe, expect, it } from 'vitest';
import { buildDocumentMasterPreviewHtml } from '$lib/util/document-master-preview.util.svelte';

const filledSetting = {
	pageSize: 'A4',
	pageOrientation: 'portrait',
	marginTop: 20,
	marginBottom: 20,
	marginLeft: 15,
	marginRight: 15,
	paddingTop: 10,
	paddingBottom: 10,
	paddingLeft: 10,
	paddingRight: 10,
	showHeader: true,
	showFooter: true
};

describe('document master preview html', () => {
	it('renders the header and footer from the selected Document Setting', () => {
		const html = buildDocumentMasterPreviewHtml({
			documentHtml: '<p class="body-only">Document body</p>',
			documentTitle: 'Document name',
			headerHtml: '<div class="setting-letterhead">{{hospital_name}} letterhead</div>',
			footerHtml: '<div class="setting-footer">Printed by {{print_by}}</div>',
			setting: filledSetting
		});

		expect(html).toContain('class="setting-letterhead"');
		expect(html).toContain('Sample Hospital letterhead');
		expect(html).toContain('class="setting-footer"');
		expect(html).toContain('print-layout-table');
		expect(html).toContain('print-chrome-bottom');
		expect(html).toContain('class="body-only"');
	});

	it('does not render a Document Name header from documentTitle', () => {
		const html = buildDocumentMasterPreviewHtml({
			documentHtml: '<p class="body-only">Document body</p>',
			documentTitle: 'Document name',
			headerHtml: '',
			footerHtml: '',
			setting: filledSetting
		});

		expect(html).not.toContain('class="document-name"');
		expect(html).not.toContain('<div class="print-header">');
		expect(html).not.toContain('print-layout-table');
		expect(html).toContain('class="body-only"');
	});

	it('renders plain document HTML when no document setting is selected', () => {
		const html = buildDocumentMasterPreviewHtml({
			documentHtml: '<p class="body-only">Document body</p>',
			documentTitle: 'My document name',
			headerHtml: '',
			footerHtml: '',
			setting: null
		});

		expect(html).not.toContain('class="document-name"');
		expect(html).not.toContain('<div class="print-header">');
		expect(html).not.toContain('print-layout-table');
		expect(html).toContain('class="body-only"');
	});

	it('honours showHeader and showFooter from the Document Setting', () => {
		const html = buildDocumentMasterPreviewHtml({
			documentHtml: '<p>Body</p>',
			documentTitle: 'Document name',
			headerHtml: '<div class="setting-letterhead">Header</div>',
			footerHtml: '<div class="setting-footer">Footer</div>',
			setting: { ...filledSetting, showHeader: false, showFooter: false }
		});

		expect(html).not.toContain('class="setting-letterhead"');
		expect(html).not.toContain('class="setting-footer"');
		expect(html).not.toContain('print-layout-table');
		expect(html).toContain('<div class="content">');
	});
});
