import { captureWorkflowImageUrl } from '../../src/lib/docs/capture-paths.ts';
import { buildWorkflowMermaid } from './mermaid.ts';
import { plainBeforeStart, plainSummary, plainTroubleshooting } from './copy.ts';

export type CaptureStep = {
	index: number;
	title: string;
	instruction: string;
	imageFile: string;
	caption: string;
};

export type ComposeInput = {
	slug: string;
	title: string;
	moduleName: string;
	pageUrl: string;
	pageId: number;
	moduleId: number;
	needsVisit: boolean;
	accessDenied: boolean;
	captureStatus: 'complete' | 'failed';
	steps: CaptureStep[];
	capturedAt: string;
	lastError?: string | null;
};

export function composeWorkflowMarkdown(input: ComposeInput): string {
	const mermaidSteps = [
		'Sign in',
		`Open ${input.moduleName}`,
		`Open ${input.title}`,
		'Finish on this screen'
	];
	const walkthrough = input.steps
		.map((s) => {
			const img = captureWorkflowImageUrl(input.slug, s.imageFile);
			return `### Step ${s.index}: ${s.title}\n\n${s.instruction}\n\n![${s.caption}](${img})\n*${s.caption}*`;
		})
		.join('\n\n');

	return `---
title: "${input.title.replace(/"/g, '\\"')}"
description: "Step-by-step guide for ${input.title} in ${input.moduleName}."
docType: workflow
slug: workflows/${input.slug}
pageId: ${input.pageId}
moduleId: ${input.moduleId}
pageUrl: "${input.pageUrl}"
generated: false
captureStatus: ${input.captureStatus}
capturedAt: "${input.capturedAt}"${input.lastError ? `\ncaptureError: "${input.lastError.replace(/"/g, '\\"')}"` : ''}
sinceVersion: "1.5.0"
lastReviewed: "${input.capturedAt.slice(0, 10)}"
---

## What this screen is for

${plainSummary(input.title, input.moduleName)}

## Before you start

${plainBeforeStart(input.needsVisit)}

## Quick map

\`\`\`mermaid
${buildWorkflowMermaid(mermaidSteps)}
\`\`\`

## Walkthrough

${walkthrough || '_Screenshots could not be captured. Run `npm run db:seed:docs-demo`, start the dev server, then re-run docs capture._'}

## If something goes wrong

${plainTroubleshooting(input.accessDenied, input.needsVisit)}

## Legal

Only open patient information when your job requires it. Follow your hospital privacy rules.
`;
}
