export type DocFrontmatter = {
	title?: string;
	description?: string;
	docType?: string;
	slug?: string;
	pageId?: number;
	moduleId?: number;
	pageUrl?: string;
	sinceVersion?: string;
	lastReviewed?: string;
	draft?: boolean;
	generated?: boolean;
	captureStatus?: string;
	capturedAt?: string;
};

export function parseMarkdownDoc(raw: string): {
	frontmatter: DocFrontmatter;
	body: string;
} {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return { frontmatter: {}, body: raw };
	const yaml = match[1];
	const body = match[2];
	const frontmatter: DocFrontmatter = {};
	for (const line of yaml.split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		const key = kv[1];
		let val = kv[2].trim();
		if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
		if (key === 'pageId' || key === 'moduleId') {
			(frontmatter as Record<string, unknown>)[key] = Number(val);
		} else if (key === 'draft' || key === 'generated') {
			(frontmatter as Record<string, unknown>)[key] = val === 'true';
		} else {
			(frontmatter as Record<string, unknown>)[key] = val;
		}
	}
	return { frontmatter, body };
}

type ListBlock = { type: 'ul' | 'ol'; items: string[] };

export type MarkdownToHtmlOptions = {
	/** When set, called for image hrefs before default resolution (e.g. workflow capture PNGs). */
	resolveImage?: (href: string) => string | undefined;
};

function resolveImageHref(href: string, options?: MarkdownToHtmlOptions): string {
	const trimmed = href.trim();
	const resolved = options?.resolveImage?.(trimmed);
	if (resolved) return resolved;
	return resolveDocImageSrc(trimmed);
}

/** Minimal markdown to HTML for hospital-facing docs. */
export function markdownToHtml(md: string, options?: MarkdownToHtmlOptions): string {
	const lines = md.split('\n');
	const out: string[] = [];
	let inCode = false;
	let codeLang = '';
	const codeBuf: string[] = [];
	let listBlock: ListBlock | null = null;

	const flushList = () => {
		if (!listBlock || listBlock.items.length === 0) {
			listBlock = null;
			return;
		}
		const tag = listBlock.type === 'ul' ? 'ul' : 'ol';
		const itemClass = listBlock.type === 'ul' ? 'docs-li' : 'docs-oli';
		out.push(
			`<${tag} class="docs-${listBlock.type}">` +
				listBlock.items.map((item) => `<li class="${itemClass}">${item}</li>`).join('') +
				`</${tag}>`
		);
		listBlock = null;
	};

	const flushCode = () => {
		if (!inCode) return;
		if (codeLang === 'mermaid') {
			out.push(
				`<div class="docs-mermaid-src" data-mermaid="${encodeURIComponent(codeBuf.join('\n'))}"></div>`
			);
		} else {
			out.push(`<pre class="docs-pre"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
		}
		codeBuf.length = 0;
		inCode = false;
		codeLang = '';
	};

	const isTableRow = (line: string) => line.trim().startsWith('|');
	const isTableSeparator = (cells: string[]) =>
		cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));

	const parseTableCells = (line: string) =>
		line
			.trim()
			.replace(/^\|/, '')
			.replace(/\|$/, '')
			.split('|')
			.map((c) => c.trim());

	const flushTable = (tableLines: string[]) => {
		if (tableLines.length === 0) return;
		const rows = tableLines.map(parseTableCells).filter((cells) => cells.length > 0);
		if (rows.length === 0) return;
		let header = rows[0];
		let bodyRows = rows.slice(1);
		if (bodyRows.length > 0 && isTableSeparator(bodyRows[0])) {
			bodyRows = bodyRows.slice(1);
		}
		const thead =
			'<thead><tr>' +
			header.map((c) => `<th scope="col">${inlineMd(c)}</th>`).join('') +
			'</tr></thead>';
		const tbody =
			'<tbody>' +
			bodyRows
				.map(
					(row) =>
						'<tr>' + row.map((c) => `<td>${inlineMd(c)}</td>`).join('') + '</tr>'
				)
				.join('') +
			'</tbody>';
		out.push(
			`<div class="docs-table-scroll"><table class="table table-zebra docs-table">${thead}${tbody}</table></div>`
		);
	};

	let i = 0;
	while (i < lines.length) {
		let line = lines[i];

		if (line.startsWith('```')) {
			flushList();
			if (!inCode) {
				inCode = true;
				codeLang = line.slice(3).trim();
			} else flushCode();
			i++;
			continue;
		}
		if (inCode) {
			codeBuf.push(line);
			i++;
			continue;
		}

		if (isTableRow(line)) {
			flushList();
			const tableLines: string[] = [];
			while (i < lines.length && isTableRow(lines[i])) {
				tableLines.push(lines[i]);
				i++;
			}
			flushTable(tableLines);
			continue;
		}

		if (/^[-*] /.test(line)) {
			if (!listBlock || listBlock.type !== 'ul') {
				flushList();
				listBlock = { type: 'ul', items: [] };
			}
			listBlock.items.push(inlineMd(line.slice(2)));
			i++;
			continue;
		}
		if (/^\d+\. /.test(line)) {
			if (!listBlock || listBlock.type !== 'ol') {
				flushList();
				listBlock = { type: 'ol', items: [] };
			}
			listBlock.items.push(inlineMd(line.replace(/^\d+\.\s/, '')));
			i++;
			continue;
		}

		flushList();

		if (line.startsWith('# ')) {
			out.push(`<h1 class="docs-h1">${inlineMd(line.slice(2))}</h1>`);
			i++;
			continue;
		}
		if (line.startsWith('## ')) {
			out.push(`<h2 class="docs-h2">${inlineMd(line.slice(3))}</h2>`);
			i++;
			continue;
		}
		if (line.startsWith('### ')) {
			out.push(`<h3 class="docs-h3">${inlineMd(line.slice(4))}</h3>`);
			i++;
			continue;
		}
		if (line.startsWith('#### ')) {
			out.push(`<h4 class="docs-h4">${inlineMd(line.slice(5))}</h4>`);
			i++;
			continue;
		}

		if (/^>{1}\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (i < lines.length && /^>{1}\s?/.test(lines[i])) {
				quoteLines.push(lines[i].replace(/^>\s?/, ''));
				i++;
			}
			const inner = quoteLines.map((q) => `<p class="docs-p">${inlineMd(q)}</p>`).join('');
			out.push(`<blockquote class="docs-blockquote">${inner}</blockquote>`);
			continue;
		}

		const figureMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
		if (figureMatch) {
			const alt = figureMatch[1];
			const src = resolveImageHref(figureMatch[2], options);
			const cap = lines[i + 1]?.match(/^\*([^*]+)\*\s*$/) ? lines[i + 1].slice(1, -1) : '';
			out.push(
				`<figure class="docs-figure"><img class="docs-figure-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />${cap ? `<figcaption class="docs-figure-caption">${inlineMd(cap)}</figcaption>` : ''}</figure>`
			);
			if (cap) i += 2;
			else i++;
			continue;
		}

		if (line.startsWith(':::tip')) {
			const tipLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith(':::')) {
				if (lines[i].trim()) tipLines.push(lines[i]);
				i++;
			}
			if (lines[i]?.startsWith(':::')) i++;
			out.push(
				`<aside class="docs-callout docs-callout-tip"><p class="docs-p">${tipLines.map((t) => inlineMd(t)).join(' ')}</p></aside>`
			);
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
			out.push('<hr class="docs-hr" />');
			i++;
			continue;
		}

		if (!line.trim()) {
			i++;
			continue;
		}

		out.push(`<p class="docs-p">${inlineMd(line)}</p>`);
		i++;
	}

	flushList();
	flushCode();
	return out.join('\n');
}

function inlineMd(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\*([^*]+)\*/g, '<em>$1</em>')
		.replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>')
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a class="link link-primary docs-link" href="$2">$1</a>'
		);
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Resolve capture paths and absolute static URLs for docs images. */
export function resolveDocImageSrc(href: string): string {
	const trimmed = href.trim();
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
		return trimmed;
	}
	if (trimmed.startsWith('docs/capture/')) {
		return `/${trimmed}`;
	}
	return `/${trimmed.replace(/^\.\//, '')}`;
}
