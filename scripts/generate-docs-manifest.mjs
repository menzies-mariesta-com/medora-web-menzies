/**
 * Generates src/lib/docs/manifest.json and stub markdown from information-table-seed.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'src/lib/server/db/seed/information-table-seed.ts');
const contentDir = join(root, 'src/lib/docs/content');
const manifestPath = join(root, 'src/lib/docs/manifest.json');

const refreshStubs = process.argv.includes('--refresh-stubs');

function readFrontmatterGenerated(fullPath) {
	if (!existsSync(fullPath)) return null;
	const raw = readFileSync(fullPath, 'utf8');
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return false;
	for (const line of match[1].split('\n')) {
		const m = line.match(/^generated:\s*(true|false)\s*$/);
		if (m) return m[1] === 'true';
	}
	return false;
}

function pageUrlToSlug(pageUrl) {
	const path = pageUrl.replace(/^\/medora\/home\//, '').replace(/\//g, '-');
	return path || 'home';
}

function parseModules(text) {
	const modules = [];
	const re = /\(\s*(\d+)\s*,\s*'([^']+)'\s*,\s*\d+\s*,\s*\d+\s*,\s*'([^']+)'\s*,\s*'([^']*)'/g;
	let m;
	const block = text.slice(text.indexOf('INSERT INTO module'), text.indexOf('seedLogger.info(\'Seeded: module\')'));
	while ((m = re.exec(block)) !== null) {
		modules.push({
			id: Number(m[1]),
			name: m[2],
			moduleUrl: m[3],
			imageUrl: m[4]
		});
	}
	return modules;
}

function parsePages(text) {
	const pages = [];
	const pageBlockStart = text.indexOf('INSERT INTO page (id, name, module_id');
	const pageBlockEnd = text.indexOf('ON CONFLICT (id) DO NOTHING;', pageBlockStart);
	const block = text.slice(pageBlockStart, pageBlockEnd);
	const re =
		/\(\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*\d+\s*,\s*(null|\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*\)/g;
	let m;
	while ((m = re.exec(block)) !== null) {
		const parentId = m[4] === 'null' ? null : Number(m[4]);
		pages.push({
			id: Number(m[1]),
			name: m[2].replace(/''/g, "'"),
			moduleId: Number(m[3]),
			parentId,
			pageUrl: m[5],
			sequenceNo: Number(m[6])
		});
	}
	const extraBlocks = [
		text.slice(text.indexOf('VALUES (530003,'), text.indexOf('seedLogger.info(\'Seeded: page\')')),
		text.slice(text.indexOf('VALUES\n\t\t\t(150003,'), text.indexOf('INSERT INTO user_group_page'))
	];
	for (const eb of extraBlocks) {
		while ((m = re.exec(eb)) !== null) {
			const parentId = m[4] === 'null' ? null : Number(m[4]);
			const id = Number(m[1]);
			if (!pages.some((p) => p.id === id)) {
				pages.push({
					id,
					name: m[2].replace(/''/g, "'"),
					moduleId: Number(m[3]),
					parentId,
					pageUrl: m[5],
					sequenceNo: Number(m[6])
				});
			}
		}
	}
	return pages;
}

function walkApiRoutes(dir, base = '') {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			out.push(...walkApiRoutes(p, `${base}/${name}`));
		} else if (name === '+server.ts') {
			const routePath = base.replace('/src/routes/api', '/api');
			out.push(routePath);
		}
	}
	return out;
}

function stubWorkflowMd(page, moduleName) {
	const slug = pageUrlToSlug(page.pageUrl);
	return `---
title: "${page.name.replace(/"/g, '\\"')}"
description: "How to use ${page.name} in ${moduleName}."
docType: workflow
slug: workflows/${slug}
pageId: ${page.id}
moduleId: ${page.moduleId}
pageUrl: "${page.pageUrl}"
generated: true
sinceVersion: "1.5.0"
lastReviewed: "2026-03-21"
---

## What you will do

Use **${page.name}** in **${moduleName}** for everyday hospital tasks. A full walkthrough with screenshots will appear here after documentation capture runs.

## Before you start

- You are signed in to Medora.
- Your hospital is selected.
- Your supervisor gave you access to this screen.

## Steps

1. Open **${moduleName}** from the home menu.
2. Open **${page.name}**.
3. Follow the on-screen forms and save when you are done.

## Quick map

\`\`\`mermaid
flowchart LR
  signIn[Sign in] --> module[Open ${moduleName}]
  module --> screen[Open ${page.name}]
  screen --> done[Finish task]
\`\`\`

## If something goes wrong

- **Cannot open this screen:** ask your hospital administrator to add this page to your user group.
- **Empty list or missing patient:** select a patient visit first, then return to this screen.

## Legal

Follow your hospital privacy policy when you view or enter patient information.
`;
}

const guides = [
	{ slug: 'getting-started', title: 'Getting started', file: 'guides/getting-started.md' },
	{ slug: 'security', title: 'Security and access', file: 'guides/security.md' },
	{ slug: 'coding-standards', title: 'Diagnosis coding standards', file: 'guides/coding-standards.md' }
];

const employeeRoles = [
	{ slug: 'nurse', title: 'Nurse', workflows: ['nursing-workbench-emr-vital', 'nursing-workbench-emar'] },
	{ slug: 'physician', title: 'Physician', workflows: ['consultation-emr', 'consultation-cpoe-prescription'] },
	{ slug: 'billing-clerk', title: 'Billing clerk', workflows: ['billing-op-billing', 'billing-ip-billing-bill'] },
	{ slug: 'lab-technologist', title: 'Lab technologist', workflows: ['diagnostics-lab-dashboard', 'diagnostics-lab-results'] },
	{ slug: 'hospital-admin', title: 'Hospital administrator', workflows: ['administration-staff-list', 'administration-document-master-template-library'] }
];

const machineActors = [
	{ slug: 'lis-integration', title: 'LIS / lab integration', workflows: ['diagnostics-lab-integration'] },
	{ slug: 'document-print', title: 'Document print services', workflows: [] },
	{ slug: 'barcode-emar', title: 'Barcode scanning (eMAR)', workflows: ['nursing-workbench-emar'] },
	{ slug: 'upload-service', title: 'Upload endpoints', workflows: [] },
	{ slug: 'kiosk-service-account', title: 'Kiosk / service accounts', workflows: [] }
];

const journalSections = [
	{ slug: 'registration', title: 'Registration and demographics', workflows: ['registration-patient-registration'] },
	{ slug: 'encounters', title: 'Encounters and visits', workflows: ['nursing-workbench-emr-order'] },
	{ slug: 'vitals', title: 'Vitals', workflows: ['nursing-workbench-emr-vital'] },
	{ slug: 'allergies', title: 'Allergies', workflows: ['nursing-workbench-emr-allergy'] },
	{ slug: 'orders', title: 'Orders and CPOE', workflows: ['consultation-cpoe-order'] },
	{ slug: 'results', title: 'Results', workflows: ['consultation-results', 'diagnostics-lab-results'] },
	{ slug: 'documents', title: 'Clinical documents', workflows: ['nursing-workbench-emr-clinical-document'] },
	{ slug: 'medications', title: 'Medications', workflows: ['consultation-cpoe-prescription', 'medication-order-internal-sales'] },
	{ slug: 'billing', title: 'Billing', workflows: ['billing-op-billing'] },
	{ slug: 'adt', title: 'ADT', workflows: ['adt-admission-list'] },
	{ slug: 'perioperative', title: 'Perioperative', workflows: ['perioperative-ot-board'] },
	{ slug: 'obstetrics', title: 'Obstetrics', workflows: ['obstetrics-labor-board'] },
	{ slug: 'emergency', title: 'Emergency', workflows: ['emergency-triage'] }
];

function writeMd(relPath, body, { force = false } = {}) {
	const full = join(contentDir, relPath);
	mkdirSync(dirname(full), { recursive: true });
	if (!existsSync(full)) {
		writeFileSync(full, body, 'utf8');
		return;
	}
	if (force) {
		writeFileSync(full, body, 'utf8');
		return;
	}
	const generated = readFrontmatterGenerated(full);
	if (generated === true) writeFileSync(full, body, 'utf8');
}

function writeWorkflowMd(relPath, body) {
	const full = join(contentDir, relPath);
	const force = refreshStubs && existsSync(full) && readFrontmatterGenerated(full) === true;
	writeMd(relPath, body, { force });
}

function guideStub(g) {
	return `---
title: "${g.title}"
description: "${g.title} for Medora hospitals."
docType: guide
slug: guides/${g.slug}
sinceVersion: "1.5.0"
lastReviewed: "2026-03-21"
---

## Overview

${g.title} guide for hospital teams implementing Medora.

## Next steps

Browse [workflows](/docs/workflows) by module or use **Ctrl+K** search.
`;
}

function main() {
	const seedText = readFileSync(seedPath, 'utf8');
	const modules = parseModules(seedText);
	const pages = parsePages(seedText);
	const moduleById = new Map(modules.map((m) => [m.id, m]));

	const apiDir = join(root, 'src/routes/api');
	const apis = walkApiRoutes(apiDir, '/src/routes/api');

	const childrenByParent = new Map();
	for (const p of pages) {
		if (p.parentId == null) continue;
		if (!childrenByParent.has(p.parentId)) childrenByParent.set(p.parentId, []);
		childrenByParent.get(p.parentId).push(p);
	}
	for (const [, kids] of childrenByParent) {
		kids.sort((a, b) => a.sequenceNo - b.sequenceNo);
	}
	const pageById = new Map(pages.map((p) => [p.id, p]));

	function resolveCapturePage(page) {
		const kids = childrenByParent.get(page.id);
		if (!kids?.length) return { capturePageUrl: page.pageUrl, sectionTitle: null, subTabTitle: null };
		const firstChild = kids[0];
		const sectionTitle = page.name;
		return {
			capturePageUrl: firstChild.pageUrl,
			sectionTitle,
			subTabTitle: page.pageUrl === firstChild.pageUrl ? null : firstChild.name
		};
	}

	const workflows = pages.map((p) => {
		const mod = moduleById.get(p.moduleId);
		const slug = pageUrlToSlug(p.pageUrl);
		const relPath = `workflows/${slug}.md`;
		const moduleSlug = mod ? pageUrlToSlug(mod.moduleUrl) : 'unknown';
		writeWorkflowMd(relPath, stubWorkflowMd(p, mod?.name ?? 'Medora'));
		const parentPage = p.parentId != null ? pageById.get(p.parentId) : null;
		const capture = resolveCapturePage(p);
		return {
			slug,
			path: `/docs/workflows/${slug}`,
			title: p.name,
			pageId: p.id,
			moduleId: p.moduleId,
			moduleName: mod?.name ?? '',
			moduleSlug,
			pageUrl: p.pageUrl,
			capturePageUrl: capture.capturePageUrl,
			sectionTitle: capture.sectionTitle,
			subTabTitle: capture.subTabTitle,
			parentPageTitle: parentPage?.name ?? null,
			contentFile: relPath
		};
	});

	const moduleLandings = modules.map((m) => ({
		slug: pageUrlToSlug(m.moduleUrl),
		name: m.name,
		moduleId: m.id,
		moduleUrl: m.moduleUrl,
		workflows: workflows.filter((w) => w.moduleId === m.id).map((w) => w.slug)
	}));

	for (const g of guides) {
		writeMd(g.file, guideStub(g));
	}

	for (const r of employeeRoles) {
		writeMd(
			`roles/employee/${r.slug}.md`,
			`---
title: "${r.title}"
docType: role
slug: roles/employee/${r.slug}
roleKind: employee
workflowSlugs: ${JSON.stringify(r.workflows)}
---

## ${r.title}

Role-based index of Medora workflows for **${r.title}**.

${r.workflows.map((s) => `- [${s}](/docs/workflows/${s})`).join('\n')}
`
		);
	}

	for (const m of machineActors) {
		writeMd(
			`roles/machine/${m.slug}.md`,
			`---
title: "${m.title}"
docType: role
slug: roles/machine/${m.slug}
roleKind: machine
workflowSlugs: ${JSON.stringify(m.workflows)}
---

## ${m.title}

Integration, device, or service account documentation for **${m.title}**.

${m.workflows.map((s) => `- [${s}](/docs/workflows/${s})`).join('\n') || '- See API reference for upload and print endpoints.'}
`
		);
	}

	for (const j of journalSections) {
		writeMd(
			`patient-journal/${j.slug}.md`,
			`---
title: "${j.title}"
docType: journal
slug: patient-journal/${j.slug}
workflowSlugs: ${JSON.stringify(j.workflows)}
---

## Patient journal: ${j.title}

Longitudinal chart section. Related workflows:

${j.workflows.map((s) => `- [${s}](/docs/workflows/${s})`).join('\n')}
`
		);
	}

	writeMd(
		'legal/index.md',
		`---
title: "Legal and compliance"
docType: legal
slug: legal
sinceVersion: "1.5.0"
---

## Disclaimer

Medora documentation is for operational guidance. Hospitals remain responsible for clinical policy, privacy, and regulatory compliance.

## Third-party data

Diagnosis coding may use WHO ICD catalogs; medication data may use RxNorm and related open datasets. Review vendor terms before production use.

## Document templates

Review master templates with hospital legal and clinical policy before enabling for patients.
`
	);

	writeMd(
		'releases/index.md',
		`---
title: "Release notes"
docType: release
slug: releases
---

## 1.5.0

- Master document template catalog and hospital template access
- Diagnostics LIS core (catalog, accession, worklists, results)
- Public documentation site (Wash Design parity)
`
	);

	writeMd(
		'templates/index.md',
		`---
title: "Document templates"
docType: templates
slug: templates
---

## Master templates

Hospitals enable catalog templates under Administration. Content is maintained at master level; see Document Master in product docs.

## Count

The catalog ships hundreds of HTML print templates across clinical, finance, HR, and operational domains.
`
	);

	const searchIndex = [
		...workflows.map((w) => ({
			title: w.title,
			href: w.path,
			category: 'Workflow',
			keywords: `${w.moduleName} ${w.pageUrl}`
		})),
		...guides.map((g) => ({
			title: g.title,
			href: `/docs/guides/${g.slug}`,
			category: 'Guide',
			keywords: g.slug
		})),
		...employeeRoles.map((r) => ({
			title: r.title,
			href: `/docs/roles/employee/${r.slug}`,
			category: 'Employee role',
			keywords: r.slug
		})),
		...machineActors.map((m) => ({
			title: m.title,
			href: `/docs/roles/machine/${m.slug}`,
			category: 'Machine role',
			keywords: m.slug
		})),
		...journalSections.map((j) => ({
			title: j.title,
			href: `/docs/patient-journal/${j.slug}`,
			category: 'Patient journal',
			keywords: j.slug
		})),
		{ title: 'Legal', href: '/docs/legal', category: 'Legal', keywords: 'compliance privacy' },
		{ title: 'Releases', href: '/docs/releases', category: 'Release', keywords: 'changelog version' },
		{ title: 'Templates', href: '/docs/templates', category: 'Templates', keywords: 'document catalog' }
	];

	const manifest = {
		generatedAt: new Date().toISOString(),
		version: '1.5.0',
		stats: {
			modules: modules.length,
			workflows: workflows.length,
			apis: apis.length,
			templates: 381,
			journalSections: journalSections.length
		},
		modules: moduleLandings,
		workflows,
		guides,
		employeeRoles,
		machineActors,
		journalSections,
		apis: apis.slice(0, 500),
		searchIndex,
		prerenderPaths: [
			'/docs',
			'/docs/workflows',
			...workflows.map((w) => w.path),
			...guides.map((g) => `/docs/guides/${g.slug}`),
			...employeeRoles.map((r) => `/docs/roles/employee/${r.slug}`),
			...machineActors.map((m) => `/docs/roles/machine/${m.slug}`),
			...journalSections.map((j) => `/docs/patient-journal/${j.slug}`),
			'/docs/legal',
			'/docs/releases',
			'/docs/templates',
			...moduleLandings.map((m) => `/docs/modules/${m.slug}`)
		]
	};

	mkdirSync(dirname(manifestPath), { recursive: true });
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
	console.log(
		`docs manifest: ${workflows.length} workflows, ${modules.length} modules, ${apis.length} APIs`
	);
}

main();
