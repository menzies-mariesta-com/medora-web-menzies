import manifest from '$lib/docs/manifest.json';
import type { DocAdjacentItem } from './types';

function titleForPath(href: string): string {
	const fromSearch = manifest.searchIndex.find((i) => i.href === href);
	if (fromSearch) return fromSearch.title;
	const wf = manifest.workflows.find((w) => w.path === href);
	if (wf) return wf.title;
	const segment = href.replace(/^\/docs\/?/, '').split('/').pop();
	return segment?.replace(/-/g, ' ') ?? href;
}

/** Walk prerender path order for prev/next chrome. */
export function getAdjacentDocs(slugParts: string[]): {
	prev: DocAdjacentItem | null;
	next: DocAdjacentItem | null;
} {
	const path = slugParts.length ? `/docs/${slugParts.join('/')}` : '/docs';
	const paths = manifest.prerenderPaths.filter((p) => p !== '/docs');
	const index = paths.indexOf(path);
	if (index < 0) return { prev: null, next: null };
	const prev =
		index > 0 ? { href: paths[index - 1]!, title: titleForPath(paths[index - 1]!) } : null;
	const next =
		index < paths.length - 1
			? { href: paths[index + 1]!, title: titleForPath(paths[index + 1]!) }
			: null;
	return { prev, next };
}

const SECTION_LABELS: Record<string, string> = {
	guides: 'Guides',
	workflows: 'Workflows',
	modules: 'Modules',
	roles: 'Roles',
	'patient-journal': 'Patient journal',
	templates: 'Templates',
	legal: 'Legal',
	releases: 'Releases'
};

export function getDocsSectionLabel(slugParts: string[]): string {
	const seg = slugParts[0];
	if (!seg) return 'Documentation';
	return SECTION_LABELS[seg] ?? seg.replace(/-/g, ' ');
}
