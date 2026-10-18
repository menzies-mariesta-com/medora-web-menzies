import type { BrowserContext, Page } from '@playwright/test';
import { DEFAULT_HOSPITAL_ID } from './constants.ts';
import { authErrorFromPage } from './auth.ts';
import {
	warmupHospitalHome,
	waitForAppChrome,
	waitForScreenContent,
	waitForTableSettled,
	isScreenBlank
} from './wait-ui.ts';
import {
	ensureInventoryFromStoreCookie,
	pathIsInventoryOps,
	slugUsesWardReceivingStore
} from './inventory-context.ts';

export type WorkflowRow = {
	slug: string;
	title: string;
	moduleName: string;
	pageUrl: string;
	pageId: number;
	moduleId: number;
	capturePageUrl?: string;
	sectionTitle?: string | null;
	subTabTitle?: string | null;
	parentPageTitle?: string | null;
};

export type Recipe = {
	needsVisit?: boolean;
	queryParams?: Record<string, string>;
	waitSelector?: string;
	waitApiPath?: string;
	minTableRows?: number;
};

export function effectivePageUrl(workflow: WorkflowRow): string {
	return workflow.capturePageUrl ?? workflow.pageUrl;
}

export function hospitalAppPath(pageUrl: string, hospitalId = DEFAULT_HOSPITAL_ID): string {
	const suffix = pageUrl.replace(/^\/medora\/home/, '');
	return `/medora/hospital/${hospitalId}/home${suffix}`;
}

export function inferNeedsVisit(pageUrl: string, recipe?: Recipe): boolean {
	if (recipe?.needsVisit !== undefined) return recipe.needsVisit;
	if (pageUrl.includes('patient-visit-history')) return false;
	const skip = [
		'-list',
		'dashboard',
		'worklist',
		'catalog',
		'master',
		'setup',
		'integration',
		'census',
		'bed-status',
		'track-board',
		'registry',
		'appointment',
		'administration'
	];
	if (skip.some((s) => pageUrl.includes(s))) return false;
	return /\/(emr|ipd|consultation|emergency|obstetrics|perioperative|billing|medication-order|diagnostics)\//.test(
		pageUrl
	);
}

export type GotoWorkflowResult = {
	accessDenied: boolean;
	blankScreen: boolean;
};

export async function gotoWorkflow(
	page: Page,
	workflow: WorkflowRow,
	recipe: Recipe | undefined,
	visitId: string | null,
	hospitalId = DEFAULT_HOSPITAL_ID,
	context?: BrowserContext
): Promise<GotoWorkflowResult> {
	await warmupHospitalHome(page, hospitalId);

	const targetUrl = effectivePageUrl(workflow);
	const appPath = hospitalAppPath(targetUrl, hospitalId);
	if (context && pathIsInventoryOps(appPath)) {
		await ensureInventoryFromStoreCookie(context, {
			wardReceivingStore: slugUsesWardReceivingStore(workflow.slug)
		});
	}
	const url = new URL(appPath, page.url());
	if (recipe?.queryParams) {
		for (const [k, v] of Object.entries(recipe.queryParams)) url.searchParams.set(k, v);
	}
	if (visitId && inferNeedsVisit(targetUrl, recipe)) {
		url.searchParams.set('visitId', visitId);
	}

	const apiPath = recipe?.waitApiPath ?? '/api/medora/';
	const apiDone = page
		.waitForResponse(
			(r) =>
				r.url().includes(apiPath) &&
				r.request().method() === 'GET' &&
				r.ok(),
			{ timeout: 30_000 }
		)
		.catch(() => {});

	await page.goto(url.pathname + url.search, { waitUntil: 'domcontentloaded' });
	await apiDone;
	await page.waitForURL((u) => !u.pathname.endsWith('/document-master'), { timeout: 8_000 }).catch(() => {});
	const pathname = new URL(page.url()).pathname;
	await waitForAppChrome(page, pathname);
	await waitForTableSettled(page, {
		waitApiPath: recipe?.waitApiPath,
		minTableRows: recipe?.minTableRows
	});
	await waitForScreenContent(page, recipe?.waitSelector);

	const authErr = authErrorFromPage(page);
	if (authErr) throw authErr;
	const denied =
		(await page.getByText(/access denied|not authorized|forbidden/i).count()) > 0;
	const blankScreen = !denied && (await isScreenBlank(page));
	return { accessDenied: denied, blankScreen };
}
