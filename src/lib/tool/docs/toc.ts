import type { TocItem } from './types';

/** Collect h2/h3 from an article root. */
export function collectToc(root: HTMLElement | null): TocItem[] {
	if (!root) return [];
	const headings = root.querySelectorAll('h2[id], h3[id]');
	const items: TocItem[] = [];
	for (const el of headings) {
		const level = el.tagName === 'H2' ? 2 : 3;
		const id = el.id;
		const text = el.textContent?.trim() ?? '';
		if (id && text) items.push({ id, text, level });
	}
	return items;
}

export function observeActiveHeading(
	root: HTMLElement | null,
	onChange: (id: string | null) => void
): () => void {
	if (!root) return () => {};
	const headings = [...root.querySelectorAll('h2[id], h3[id]')];
	if (headings.length === 0) return () => {};

	const observer = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((e) => e.isIntersecting)
				.sort((a, b) => {
					const ratio = b.intersectionRatio - a.intersectionRatio;
					if (Math.abs(ratio) > 0.02) return ratio;
					return a.boundingClientRect.top - b.boundingClientRect.top;
				});
			if (visible[0]?.target.id) onChange(visible[0].target.id);
		},
		{ rootMargin: '-12% 0px -68% 0px', threshold: [0, 0.1, 0.25, 0.5, 1] }
	);

	for (const h of headings) observer.observe(h);
	return () => observer.disconnect();
}
