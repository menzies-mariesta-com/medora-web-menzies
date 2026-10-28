/**
 * Fail CI before `vite build` if prerender would hit a 404 from internal /docs links.
 * Mirrors SvelteKit prerender crawl: manifest paths + markdown links + docs shell nav.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, 'src/lib/docs/content');
const manifest = JSON.parse(
	readFileSync(join(root, 'src/lib/docs/manifest.json'), 'utf8')
);

/** Keep in sync with DocsSidebar.svelte */
const SIDEBAR_GUIDES = ['getting-started', 'security', 'coding-standards'];
const SIDEBAR_EMPLOYEE_ROLES = [
	'nurse',
	'physician',
	'hospital-admin',
	'lab-technologist',
	'billing-clerk'
];
const SIDEBAR_MACHINE_ROLES = [
	'lis-integration',
	'barcode-emar',
	'document-print',
	'kiosk-service-account',
	'upload-service'
];
const JOURNAL_SECTIONS = [
	'registration',
	'encounters',
	'vitals',
	'allergies',
	'medications',
	'orders',
	'results',
	'documents',
	'adt',
	'emergency',
	'perioperative',
	'obstetrics',
	'billing'
];

const MARKDOWN_LINK_RE = /\]\((\/docs[^)#]+)\)/g;

function docRouteExists(pathname) {
	if (pathname === '/docs') return true;
	if (!pathname.startsWith('/docs/')) return false;
	if (pathname.startsWith('/docs/capture/')) return true;

	const parts = pathname.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
	if (parts.length === 0) return true;
	if (parts.length === 1 && parts[0] === 'workflows') return true;

	if (parts[0] === 'modules' && parts.length === 2) {
		return manifest.modules.some((m) => m.slug === parts[1]);
	}
	if (parts[0] === 'workflows' && parts.length === 2) {
		return existsSync(join(contentRoot, 'workflows', `${parts[1]}.md`));
	}
	if (parts[0] === 'guides' && parts.length === 2) {
		return existsSync(join(contentRoot, 'guides', `${parts[1]}.md`));
	}
	if (parts.join('/') === 'legal') {
		return existsSync(join(contentRoot, 'legal/index.md'));
	}
	if (parts.join('/') === 'releases') {
		return existsSync(join(contentRoot, 'releases/index.md'));
	}
	if (parts.join('/') === 'templates') {
		return existsSync(join(contentRoot, 'templates/index.md'));
	}
	if (parts[0] === 'roles' && parts.length === 3) {
		return existsSync(
			join(contentRoot, 'roles', parts[1], `${parts[2]}.md`)
		);
	}
	if (parts[0] === 'patient-journal' && parts.length === 2) {
		return existsSync(
			join(contentRoot, 'patient-journal', `${parts[1]}.md`)
		);
	}
	return false;
}

function markdownLinksInFile(filePath) {
	const text = readFileSync(filePath, 'utf8');
	const links = [];
	for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
		links.push(match[1].split('#')[0]);
	}
	return links;
}

function walkMarkdown(dir, out = []) {
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, ent.name);
		if (ent.isDirectory()) walkMarkdown(p, out);
		else if (ent.name.endsWith('.md')) out.push(p);
	}
	return out;
}

function shellNavLinks() {
	const urls = new Set(['/docs', '/docs/workflows', '/docs/templates', '/docs/legal', '/docs/releases']);

	for (const slug of SIDEBAR_GUIDES) urls.add(`/docs/guides/${slug}`);
	for (const g of manifest.guides ?? []) urls.add(`/docs/guides/${g.slug}`);

	for (const mod of manifest.modules) {
		urls.add(`/docs/modules/${mod.slug}`);
		for (const wf of [...new Set(mod.workflows)]) {
			urls.add(`/docs/workflows/${wf}`);
		}
	}

	for (const slug of SIDEBAR_EMPLOYEE_ROLES) {
		urls.add(`/docs/roles/employee/${slug}`);
	}
	for (const slug of SIDEBAR_MACHINE_ROLES) {
		urls.add(`/docs/roles/machine/${slug}`);
	}
	for (const slug of JOURNAL_SECTIONS) {
		urls.add(`/docs/patient-journal/${slug}`);
	}

	return [...urls];
}

function outLinksForPath(pathname) {
	if (!docRouteExists(pathname)) return { ok: false, links: [] };

	if (pathname === '/docs/workflows') {
		return {
			ok: true,
			links: manifest.modules.map((m) => `/docs/modules/${m.slug}`)
		};
	}
	if (pathname.startsWith('/docs/modules/')) {
		const slug = pathname.split('/')[3];
		const mod = manifest.modules.find((m) => m.slug === slug);
		if (!mod) return { ok: false, links: [] };
		return {
			ok: true,
			links: [...new Set(mod.workflows)].map((s) => `/docs/workflows/${s}`)
		};
	}

	const parts = pathname.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
	let rel = null;
	if (parts[0] === 'workflows' && parts.length === 2) {
		rel = join(contentRoot, 'workflows', `${parts[1]}.md`);
	} else if (parts[0] === 'guides' && parts.length === 2) {
		rel = join(contentRoot, 'guides', `${parts[1]}.md`);
	} else if (parts[0] === 'roles' && parts.length === 3) {
		rel = join(contentRoot, 'roles', parts[1], `${parts[2]}.md`);
	} else if (parts.join('/') === 'legal') {
		rel = join(contentRoot, 'legal/index.md');
	} else if (parts.join('/') === 'releases') {
		rel = join(contentRoot, 'releases/index.md');
	} else if (parts.join('/') === 'templates') {
		rel = join(contentRoot, 'templates/index.md');
	}

	if (rel && existsSync(rel)) {
		return { ok: true, links: markdownLinksInFile(rel) };
	}
	return { ok: true, links: [] };
}

const errors = [];

for (const path of manifest.prerenderPaths ?? []) {
	if (!docRouteExists(path)) {
		errors.push(`prerenderPaths entry missing content: ${path}`);
	}
}

for (const path of shellNavLinks()) {
	if (!docRouteExists(path)) {
		errors.push(`docs shell link target missing: ${path}`);
	}
}

for (const file of walkMarkdown(contentRoot)) {
	for (const href of markdownLinksInFile(file)) {
		if (href.startsWith('/docs/capture/')) continue;
		if (!docRouteExists(href)) {
			errors.push(`broken markdown link ${href} in ${file.replace(root + '/', '')}`);
		}
	}
}

const queue = [
	'/',
	'/pricing',
	...(manifest.prerenderPaths ?? []),
	...shellNavLinks()
];
const seen = new Set();
while (queue.length > 0) {
	const path = queue.shift();
	if (seen.has(path)) continue;
	seen.add(path);

	if (path === '/' || path === '/pricing') continue;

	if (!path.startsWith('/docs')) continue;

	const { ok, links } = outLinksForPath(path);
	if (!ok) {
		errors.push(`crawl: missing doc route ${path}`);
		continue;
	}
	for (const link of links) {
		if (!link.startsWith('/docs/capture')) queue.push(link);
	}
}

if (errors.length > 0) {
	console.error('check-prerender-links failed:\n');
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(
	`check-prerender-links: ok (${seen.size} doc routes crawled, ${manifest.prerenderPaths?.length ?? 0} prerender paths)`
);
