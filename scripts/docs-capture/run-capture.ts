import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import {
	CHECKPOINT_PATH,
	CONTENT_DIR,
	DEFAULT_HOSPITAL_ID,
	MANIFEST_PATH,
	RECIPES_PATH,
	STORAGE_STATE_PATH,
	VIEWPORT
} from './constants.ts';
import {
	AuthRequiredError,
	authErrorFromPage,
	ensureAuthenticated,
	loginSeedAdmin,
	persistStorageState
} from './auth.ts';
import {
	loadCheckpointData,
	markCompleted,
	markFailed,
	markPendingAuth
} from './checkpoint.ts';
import { resolveDemoVisitId } from './context.ts';
import { gotoWorkflow, inferNeedsVisit, effectivePageUrl, type WorkflowRow } from './navigate.ts';
import { captureWorkflowShots } from './screenshot.ts';
import { composeWorkflowMarkdown } from './compose-md.ts';
import { waitForDevServer } from './wait-dev.ts';
import { buildOpenScreenInstruction, stepTitleForFile } from './nav-copy.ts';
import { DialogNotReadyError, TableDataNotReadyError } from './wait-ui.ts';

type Manifest = {
	workflows: WorkflowRow[];
};

type RecipesFile = {
	overrides: Record<
		string,
		{
			needsVisit?: boolean;
			queryParams?: Record<string, string>;
			waitSelector?: string;
			waitApiPath?: string;
			minTableRows?: number;
		}
	>;
};

function parseArgs() {
	const force = process.argv.includes('--force');
	const retryFailed = process.argv.includes('--retry-failed');
	const slugArg = process.argv.find((a) => a.startsWith('--slug='));
	const fromArg = process.argv.find((a) => a.startsWith('--from-slug='));
	const resume = process.argv.includes('--resume');
	return {
		force,
		retryFailed,
		slug: slugArg?.split('=')[1],
		fromSlug: fromArg?.split('=')[1],
		resume
	};
}

function instructionForShot(
	workflow: WorkflowRow,
	fileName: string,
	index: number
): { title: string; instruction: string } {
	const title = index === 0 ? 'Open the screen' : stepTitleForFile(fileName);
	if (index === 0) {
		const chromeNote =
			fileName.includes('overview') || fileName.includes('list')
				? '\n\nThe screenshot includes the **top bar**, **module strip**, and work area at **1920x1080** (unless overridden).'
				: '';
		return {
			title,
			instruction: buildOpenScreenInstruction(workflow) + chromeNote
		};
	}
	if (fileName.includes('create-open')) {
		return { title, instruction: 'Click **Add** in the table footer (or the primary add button on the page).' };
	}
	if (fileName.includes('create-form')) {
		return {
			title,
			instruction:
				'Fill required fields (red *). Click **Save** to keep a new record. Docs capture opens the form only and closes without saving.'
		};
	}
	if (fileName.includes('edit')) {
		return { title, instruction: 'Click the **edit** (pencil) icon on a row to change an existing record.' };
	}
	if (fileName.includes('delete')) {
		return {
			title,
			instruction:
				'Delete shows a confirmation step. Cancel unless you intend to remove data permanently.'
		};
	}
	return { title, instruction: 'Review the list and filters in the work area.' };
}

function writeFailedWorkflowMarkdown(
	workflow: WorkflowRow,
	recipe: RecipesFile['overrides'][string] | undefined,
	visitId: string | null,
	errorMessage: string,
	opts: { accessDenied?: boolean; blankScreen?: boolean } = {}
) {
	const targetUrl = effectivePageUrl(workflow);
	const needsVisit = inferNeedsVisit(targetUrl, recipe);
	const md = composeWorkflowMarkdown({
		slug: workflow.slug,
		title: workflow.title,
		moduleName: workflow.moduleName || 'Medora',
		pageUrl: workflow.pageUrl,
		pageId: workflow.pageId,
		moduleId: workflow.moduleId,
		needsVisit,
		accessDenied: opts.accessDenied ?? false,
		captureStatus: 'failed',
		steps: [],
		capturedAt: new Date().toISOString(),
		lastError: errorMessage
	});
	writeFileSync(`${CONTENT_DIR}/${workflow.slug}.md`, md, 'utf8');
	void visitId;
	void opts.blankScreen;
}

async function captureOne(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext,
	workflow: WorkflowRow,
	recipe: RecipesFile['overrides'][string],
	visitId: string | null,
	completed: Set<string>,
	failedSlugs: Set<string>
): Promise<boolean> {
	await ensureAuthenticated(page, context, 'Checking session before next screen…');
	const targetUrl = effectivePageUrl(workflow);
	const needsVisit = inferNeedsVisit(targetUrl, recipe);
	const { accessDenied, blankScreen } = await gotoWorkflow(
		page,
		workflow,
		recipe,
		visitId,
		DEFAULT_HOSPITAL_ID,
		context
	);
	const authErr = authErrorFromPage(page);
	if (authErr) throw authErr;

	if (blankScreen) {
		throw new Error(
			`Blank screen after navigation (${workflow.slug}). Seed demo data and check page access.`
		);
	}

	const shots = accessDenied
		? []
		: await captureWorkflowShots(page, workflow.slug, workflow.title, recipe);
	const steps = shots.map((s, i) => {
		const { title, instruction } = instructionForShot(workflow, s.fileName, i);
		return {
			index: i + 1,
			title,
			instruction,
			imageFile: s.fileName,
			caption: s.caption
		};
	});
	const md = composeWorkflowMarkdown({
		slug: workflow.slug,
		title: workflow.title,
		moduleName: workflow.moduleName || 'Medora',
		pageUrl: workflow.pageUrl,
		pageId: workflow.pageId,
		moduleId: workflow.moduleId,
		needsVisit,
		accessDenied,
		captureStatus: accessDenied || shots.length === 0 ? 'failed' : 'complete',
		steps,
		capturedAt: new Date().toISOString()
	});
	writeFileSync(`${CONTENT_DIR}/${workflow.slug}.md`, md, 'utf8');
	if (accessDenied || shots.length === 0) {
		throw new Error(`No screenshots captured for ${workflow.slug}`);
	}
	markCompleted(workflow.slug, completed, failedSlugs);
	console.log(`capture ok: ${workflow.slug}`);
	return true;
}

async function main() {
	const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4002';
	const { force, retryFailed, slug, fromSlug, resume } = parseArgs();
	const checkpointData = loadCheckpointData();
	const completed = new Set(checkpointData.completed);
	const failedSlugs = new Set(checkpointData.failedSlugs ?? []);
	const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
	const recipes = JSON.parse(readFileSync(RECIPES_PATH, 'utf8')) as RecipesFile;
	let workflows = manifest.workflows;

	if (slug) workflows = workflows.filter((w) => w.slug === slug);
	else if (retryFailed && failedSlugs.size > 0) {
		workflows = workflows.filter((w) => failedSlugs.has(w.slug));
		console.log(`Retrying ${workflows.length} failed workflow(s) from checkpoint`);
	} else if (fromSlug) {
		const idx = workflows.findIndex((w) => w.slug === fromSlug);
		if (idx >= 0) workflows = workflows.slice(idx);
	} else if (resume && checkpointData.pendingSlug) {
		const idx = workflows.findIndex((w) => w.slug === checkpointData.pendingSlug);
		if (idx >= 0) {
			workflows = workflows.slice(idx);
			console.log(`Resuming at pending slug: ${checkpointData.pendingSlug}`);
		}
	}

	const pendingTotal = workflows.filter((w) => {
		if (force) return true;
		if (retryFailed) return failedSlugs.has(w.slug);
		return !completed.has(w.slug);
	}).length;
	console.log(
		`docs capture: ${pendingTotal} workflow(s) to process (${completed.size} already in checkpoint)`
	);
	console.log(`Hospital: ${DEFAULT_HOSPITAL_ID}`);
	console.log(`Checkpoint file: ${CHECKPOINT_PATH}`);
	console.log('When 2FA is required, enter a fresh code in this terminal.\n');

	await waitForDevServer(baseURL);

	mkdirSync(CONTENT_DIR, { recursive: true });

	const headless = process.env.DOCS_CAPTURE_HEADED !== '1';
	const browser = await chromium.launch({ headless });
	const context = await browser.newContext({
		viewport: VIEWPORT,
		baseURL,
		storageState: existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined
	});
	const page = await context.newPage();
	page.setDefaultTimeout(60_000);
	await page.goto('/medora', { waitUntil: 'domcontentloaded' });
	if (authErrorFromPage(page) || page.url().includes('/auth/login')) {
		await loginSeedAdmin(page, context);
	}
	await persistStorageState(context);

	let visitId = await resolveDemoVisitId(context.request);

	let ok = 0;
	let skipped = 0;
	let failed = 0;

	for (const workflow of workflows) {
		if (!force) {
			if (retryFailed) {
				if (!failedSlugs.has(workflow.slug)) {
					skipped++;
					continue;
				}
			} else if (completed.has(workflow.slug)) {
				skipped++;
				continue;
			}
		}
		const recipe = recipes.overrides[workflow.slug];
		let attempts = 0;
		while (attempts < 3) {
			attempts++;
			try {
				await captureOne(page, context, workflow, recipe, visitId, completed, failedSlugs);
				ok++;
				break;
			} catch (err) {
				const isAuth = err instanceof AuthRequiredError;
				if (isAuth) {
					markPendingAuth(
						workflow.slug,
						completed,
						err instanceof Error ? err.message : 'auth required'
					);
					console.log(
						`\nPaused at "${workflow.slug}" (auth). Progress saved (${completed.size} complete).`
					);
					await loginSeedAdmin(page, context);
					await persistStorageState(context);
					visitId = await resolveDemoVisitId(context.request);
					console.log('Continuing with the same workflow…\n');
					continue;
				}
				failed++;
				const errMsg = err instanceof Error ? err.message : String(err);
				writeFailedWorkflowMarkdown(workflow, recipe, visitId, errMsg);
				if (err instanceof TableDataNotReadyError) {
					console.error(`capture failed (table data): ${workflow.slug}`, err.message);
				} else if (err instanceof DialogNotReadyError) {
					console.error(`capture failed (dialog): ${workflow.slug}`, err.message);
				} else {
					console.error(`capture failed: ${workflow.slug}`, err);
				}
				markFailed(workflow.slug, completed, failedSlugs, errMsg);
				break;
			}
		}
	}

	await browser.close();
	console.log(
		`\ndocs capture done: ${ok} ok, ${skipped} skipped, ${failed} failed`
	);
	console.log(`Checkpoint: ${CHECKPOINT_PATH}`);
	if (failed > 0) {
		console.log('Re-run failed only: npm run docs:capture -- --retry-failed');
		console.log('Or resume: npm run docs:capture -- --resume');
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	console.log('\nProgress is saved. Re-run: npm run docs:capture -- --resume');
	process.exit(1);
});
