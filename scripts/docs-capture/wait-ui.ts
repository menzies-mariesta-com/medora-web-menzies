import type { Frame, Page } from '@playwright/test';

const SHELL_SELECTOR = '.my-main, main, [role="main"]';

const DEFAULT_CONTENT_SELECTOR =
	'table tbody tr, .staff-subnav-tab, .wash-card, [role="tab"], .menzies-table, .my-main table';

const MODULE_BAR_BUTTON = '[data-module-bar-scroll] button';

export type TableWaitOptions = {
	/** Substring matched against response URL (default `/api/medora/`). */
	waitApiPath?: string;
	/** Minimum data rows (multi-cell tbody tr). Default 1. Set 0 in recipe to allow empty lists. */
	minTableRows?: number;
};

export class AppChromeNotReadyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AppChromeNotReadyError';
	}
}

export class TableDataNotReadyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TableDataNotReadyError';
	}
}

export class DialogNotReadyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DialogNotReadyError';
	}
}

const OPEN_DIALOG = 'dialog[open]';

async function frameLooksReady(frame: Frame): Promise<boolean> {
	return frame.evaluate(() => {
		if (document.querySelectorAll('.loading-spinner').length > 0) return false;
		const inputs = document.querySelectorAll(
			'input:not([type="hidden"]), select, textarea'
		);
		if (inputs.length >= 1) return true;
		if (document.querySelectorAll('.wash-card').length >= 1) return true;
		const main = document.querySelector('.my-main');
		return ((main?.textContent ?? '').trim().length > 40);
	});
}

async function waitForIframeDialogContent(
	page: Page,
	dialog: ReturnType<Page['locator']>,
	timeoutMs: number
): Promise<void> {
	const iframe = dialog.locator('iframe').first();
	await iframe.waitFor({ state: 'visible', timeout: timeoutMs });

	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const handle = await iframe.elementHandle();
		const frame = handle ? await handle.contentFrame() : null;
		if (frame) {
			await frame.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {});
			await frame.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
			await frame
				.locator('.loading-spinner')
				.first()
				.waitFor({ state: 'hidden', timeout: 8_000 })
				.catch(() => {});
			if (await frameLooksReady(frame)) {
				await page.waitForTimeout(200);
				return;
			}
			await frame
				.locator('input:not([type="hidden"]), .wash-card, .my-main')
				.first()
				.waitFor({ state: 'visible', timeout: 3_000 })
				.catch(() => {});
			if (await frameLooksReady(frame)) {
				await page.waitForTimeout(200);
				return;
			}
		}
		await page.waitForTimeout(200);
	}

	throw new DialogNotReadyError(
		'Dialog iframe stayed empty or loading. Check embed URL and staff registration API.'
	);
}

async function waitForInlineDialogContent(
	page: Page,
	dialog: ReturnType<Page['locator']>,
	timeoutMs: number
): Promise<void> {
	await dialog
		.locator('.loading-spinner')
		.first()
		.waitFor({ state: 'hidden', timeout: 15_000 })
		.catch(() => {});

	const ready = await page
		.waitForFunction(
			() => {
				const d = document.querySelector('dialog[open]');
				if (!d) return false;
				if (d.querySelector('.loading-spinner')) return false;
				const inputs = d.querySelectorAll(
					'input:not([type="hidden"]), select, textarea, button'
				);
				if (inputs.length >= 2) return true;
				const text = (d.textContent ?? '').replace(/\s+/g, ' ').trim();
				return text.length > 35;
			},
			undefined,
			{ timeout: timeoutMs }
		)
		.catch(() => null);

	if (!ready) {
		throw new DialogNotReadyError('Dialog visible but body content did not finish loading.');
	}
	await page.waitForTimeout(200);
}

/**
 * After opening a modal or inline create panel, wait until embedded iframe or form content is ready.
 */
export async function waitForDialogSettled(
	page: Page,
	options: { timeoutMs?: number } = {}
): Promise<void> {
	const timeoutMs = options.timeoutMs ?? 30_000;
	const dialog = page.locator(OPEN_DIALOG).last();
	const dialogVisible = await dialog
		.waitFor({ state: 'visible', timeout: 8_000 })
		.then(() => true)
		.catch(() => false);

	if (dialogVisible) {
		if ((await dialog.locator('iframe').count()) > 0) {
			await waitForIframeDialogContent(page, dialog, timeoutMs);
			return;
		}
		await waitForInlineDialogContent(page, dialog, timeoutMs);
		return;
	}

	await page
		.locator(`${SHELL_SELECTOR} input:not([type="hidden"]), ${SHELL_SELECTOR} .wash-card`)
		.first()
		.waitFor({ state: 'visible', timeout: timeoutMs })
		.catch(() => {});
	await page
		.locator('.loading-spinner')
		.first()
		.waitFor({ state: 'hidden', timeout: 10_000 })
		.catch(() => {});
	await page.waitForTimeout(200);
}

/** Paths that use `.staff-subnav-tab` under a section layout. */
function pathNeedsStaffSubNav(pathname: string): boolean {
	return pathname.includes('/staff/');
}

export async function countDataTableRows(page: Page): Promise<number> {
	return page.evaluate(() => {
		const main = document.querySelector('.my-main');
		if (!main) return 0;
		let n = 0;
		for (const tr of main.querySelectorAll('table tbody tr')) {
			if (tr.querySelectorAll('td').length > 1) n += 1;
		}
		return n;
	});
}

function tableHasPopulatedSummary(text: string): boolean {
	return /Showing \d+-\d+ of [1-9]\d*/.test(text);
}

export async function waitForTableSettled(
	page: Page,
	options: TableWaitOptions = {}
): Promise<void> {
	const hasTable = (await page.locator('.my-main table').count()) > 0;
	if (!hasTable) return;

	const minRows = options.minTableRows ?? 1;
	const timeoutMs = 30_000;

	await page
		.waitForFunction(
			() =>
				document.querySelectorAll('.my-main table tbody .loading-spinner').length ===
				0,
			{ timeout: timeoutMs }
		)
		.catch(() => {
			throw new TableDataNotReadyError(
				'Table still showing a loading spinner. Check network or increase wait time.'
			);
		});

	await page
		.locator('.my-main button.btn.loading')
		.first()
		.waitFor({ state: 'hidden', timeout: 10_000 })
		.catch(() => {});

	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const dataRows = await countDataTableRows(page);
		const bodyText = await page.locator('.my-main').first().innerText().catch(() => '');
		const showingPopulated = tableHasPopulatedSummary(bodyText);
		const stillLoading =
			(await page.locator('.my-main table tbody .loading-spinner').count()) > 0;

		if (dataRows >= minRows || showingPopulated) {
			await page.waitForTimeout(200);
			return;
		}

		if (minRows === 0 && !stillLoading) {
			await page.waitForTimeout(200);
			return;
		}

		if (!stillLoading && bodyText.includes('Showing 0 of 0') && minRows > 0) {
			throw new TableDataNotReadyError(
				'Table finished loading but has no rows (Showing 0 of 0). Run npm run db:seed:docs-demo (includes inventory demo) or check filters/hospital.'
			);
		}

		await page.waitForTimeout(200);
	}

	const dataRows = await countDataTableRows(page);
	const bodyText = await page.locator('.my-main').first().innerText().catch(() => '');
	if (dataRows >= minRows || tableHasPopulatedSummary(bodyText)) {
		return;
	}

	throw new TableDataNotReadyError(
		`Table did not show at least ${minRows} data row(s) within ${timeoutMs / 1000}s.`
	);
}

export async function waitForAppChrome(page: Page, pathname: string): Promise<void> {
	await page.locator(SHELL_SELECTOR).first().waitFor({ state: 'visible', timeout: 30_000 });

	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		const count = await page.locator(MODULE_BAR_BUTTON).count();
		if (count >= 1) break;
		await page.waitForTimeout(200);
	}

	const moduleCount = await page.locator(MODULE_BAR_BUTTON).count();
	if (moduleCount < 1) {
		throw new AppChromeNotReadyError(
			'Module bar is empty (no module buttons). Check login, hospital access, and that db:seed loaded modules/pages.'
		);
	}

	if (pathNeedsStaffSubNav(pathname)) {
		await page
			.locator('.staff-subnav-tab')
			.first()
			.waitFor({ state: 'visible', timeout: 15_000 })
			.catch(() => {
				throw new AppChromeNotReadyError(
					'Staff sub-navigation tabs did not appear (expected Staff Registration / Staff List).'
				);
			});
	}

	await page.waitForTimeout(300);
}

export async function warmupHospitalHome(page: Page, hospitalId: string): Promise<void> {
	await page.goto(`/medora/hospital/${hospitalId}/home`, {
		waitUntil: 'domcontentloaded',
		timeout: 60_000
	});
	await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
	await waitForAppChrome(page, page.url());
}

export async function waitForScreenContent(
	page: Page,
	waitSelector?: string
): Promise<void> {
	const selector = waitSelector ?? DEFAULT_CONTENT_SELECTOR;
	await page
		.locator(selector)
		.first()
		.waitFor({ state: 'visible', timeout: 30_000 })
		.catch(() => {});
	await page.waitForTimeout(400);
	await page.locator('button.btn.loading').first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

export async function isScreenBlank(page: Page): Promise<boolean> {
	const shell = page.locator(SHELL_SELECTOR).first();
	if (!(await shell.isVisible().catch(() => false))) return true;

	const scope = page.locator('.my-main').first();
	const dataRows = await countDataTableRows(page);
	const hasTableRow = dataRows > 0;
	const hasSubNav = (await scope.locator('.staff-subnav-tab').count()) > 0;
	const hasCard = (await scope.locator('.wash-card').count()) > 0;
	const hasTabs = (await scope.locator('[role="tab"]').count()) > 0;
	const hasPrimaryBtn = (await scope.locator('button.btn-primary').count()) > 0;

	return !(hasTableRow || hasSubNav || hasCard || hasTabs || hasPrimaryBtn);
}
