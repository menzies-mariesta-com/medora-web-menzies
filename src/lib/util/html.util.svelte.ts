export class HtmlUtil {
	addDataAttribute(key: string, value: string): void {
		document.documentElement.setAttribute(`data-${key}`, value);
	}

	removeDataAttribute(key: string): void {
		document.documentElement.removeAttribute(`data-${key}`);
	}

	safeHtml(html: string): string {
		const div = document.createElement('div');
		div.textContent = html;
		return div.innerHTML;
	}
}
