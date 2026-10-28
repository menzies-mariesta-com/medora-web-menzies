import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';
import { resolveDocCaptureImageHref } from '$lib/docs/capture-images.server';
import {
	markdownToHtml,
	parseMarkdownDoc,
	type DocFrontmatter
} from '$lib/util/markdown-doc.util';
import manifest from '$lib/docs/manifest.json';

const contentRoot = join(process.cwd(), 'src/lib/docs/content');

const docMarkdownOptions = {
	resolveImage: (href: string) => resolveDocCaptureImageHref(href)
};

export type LoadedDoc = {
	frontmatter: DocFrontmatter;
	html: string;
	rawBody: string;
};

export function getDocsManifest() {
	return manifest;
}

export function resolveDocContentFile(slugParts: string[]): string | null {
	if (slugParts.length === 0) return null;
	const joined = slugParts.join('/');
	if (joined === 'legal') return 'legal/index.md';
	if (joined === 'releases') return 'releases/index.md';
	if (joined === 'templates') return 'templates/index.md';
	if (slugParts[0] === 'workflows' && slugParts.length === 2) {
		return `workflows/${slugParts[1]}.md`;
	}
	if (slugParts[0] === 'guides' && slugParts.length === 2) {
		return `guides/${slugParts[1]}.md`;
	}
	if (slugParts[0] === 'modules' && slugParts.length === 2) {
		return null;
	}
	if (slugParts[0] === 'roles' && slugParts.length === 3) {
		return `roles/${slugParts[1]}/${slugParts[2]}.md`;
	}
	if (slugParts[0] === 'patient-journal' && slugParts.length === 2) {
		return `patient-journal/${slugParts[1]}.md`;
	}
	return null;
}

export function loadDocBySlugParts(slugParts: string[]): LoadedDoc {
	if (slugParts.length === 1 && slugParts[0] === 'workflows') {
		return workflowsLandingDoc();
	}

	const rel = resolveDocContentFile(slugParts);
	if (!rel) {
		if (slugParts[0] === 'modules' && slugParts[1]) {
			return moduleLandingDoc(slugParts[1]);
		}
		throw error(404, 'Documentation not found');
	}
	const full = join(contentRoot, rel);
	if (!existsSync(full)) throw error(404, 'Documentation not found');
	const raw = readFileSync(full, 'utf8');
	const { frontmatter, body } = parseMarkdownDoc(raw);
	return {
		frontmatter,
		html: markdownToHtml(body, docMarkdownOptions),
		rawBody: body
	};
}

function workflowsLandingDoc(): LoadedDoc {
	const body = `## Workflows

Step-by-step guides for hospital modules. Pick a module below, or use **Ctrl+K** on the docs site to search all workflows.

### Modules

${manifest.modules
	.map((mod) => `- [${mod.name}](/docs/modules/${mod.slug})`)
	.join('\n')}
`;
	return {
		frontmatter: {
			title: 'Workflows',
			description: 'Browse Medora workflow documentation by module',
			docType: 'workflows'
		},
		html: markdownToHtml(body, docMarkdownOptions),
		rawBody: body
	};
}

function moduleLandingDoc(moduleSlug: string): LoadedDoc {
	const mod = manifest.modules.find((m) => m.slug === moduleSlug);
	if (!mod) throw error(404, 'Module not found');
	const uniqueSlugs = [...new Set(mod.workflows)];
	const body = `## ${mod.name}

On this module you can complete day-to-day tasks in **${mod.name}**. Choose a guide below for step-by-step instructions.

### Guides in this module

${uniqueSlugs
	.map((s) => {
		const w = manifest.workflows.find((x) => x.slug === s);
		return `- [${w?.title ?? s}](/docs/workflows/${s})`;
	})
	.join('\n')}
`;
	return {
		frontmatter: {
			title: mod.name,
			description: `${mod.name} module documentation`,
			docType: 'module'
		},
		html: markdownToHtml(body, docMarkdownOptions),
		rawBody: body
	};
}

export function pageUrlToDocsWorkflowPath(pageUrl: string): string | null {
	const normalized = pageUrl.replace(/^\/medora\/home\//, '').replace(/\//g, '-');
	const w = manifest.workflows.find(
		(row) => row.pageUrl === pageUrl || row.slug === normalized
	);
	return w ? `/docs/workflows/${w.slug}` : null;
}
