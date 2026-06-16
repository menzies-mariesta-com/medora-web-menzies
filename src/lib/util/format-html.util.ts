/** Pretty-print HTML for the document master textarea editor. */
export function formatHtmlForEditor(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';
	try {
		const parser = new DOMParser();
		const parsed = parser.parseFromString(trimmed, 'text/html');
		const formatNode = (node: Node, depth: number): string => {
			const indent = '  '.repeat(depth);
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent?.trim() ?? '';
				return text ? `${indent}${text}\n` : '';
			}
			if (node.nodeType !== Node.ELEMENT_NODE) return '';
			const el = node as HTMLElement;
			const attrs = Array.from(el.attributes)
				.map((a) => ` ${a.name}="${a.value}"`)
				.join('');
			const tagName = el.tagName.toLowerCase();
			const children = Array.from(el.childNodes)
				.map((child) => formatNode(child, depth + 1))
				.join('');
			if (!children.trim()) {
				return `${indent}<${tagName}${attrs}></${tagName}>\n`;
			}
			return `${indent}<${tagName}${attrs}>\n${children}${indent}</${tagName}>\n`;
		};

		const bodyChildren = Array.from(parsed.body.childNodes)
			.map((child) => formatNode(child, 0))
			.join('')
			.trim();
		return bodyChildren || trimmed;
	} catch {
		return trimmed;
	}
}

export function appendPlaceholderToHtml(
	currentHtml: string,
	placeholder: string
): string {
	const current = currentHtml ?? '';
	const trimmed = current.trim();
	if (!trimmed) return placeholder;

	const lastChar = trimmed[trimmed.length - 1] ?? '';
	const needsSpace = !/\s/.test(lastChar) && lastChar !== '>';

	return current + (needsSpace ? ' ' : '') + placeholder;
}
