import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { CAPTURE_ASSET_DIR, VIEWPORT } from './constants.ts';
import type { ShotResult } from './screenshot.ts';
import {
	countDataTableRows,
	waitForDialogSettled,
	waitForTableSettled,
	type TableWaitOptions
} from './wait-ui.ts';
import type { Recipe } from './navigate.ts';

export type PageArchetype = 'tableCrud' | 'formOverview' | 'dashboard';

const WORK_AREA = '.my-main';

async function shot(page: Page, dir: string, fileName: string, caption: string): Promise<ShotResult> {
	await page.screenshot({ path: join(dir, fileName), fullPage: false });
	return { fileName, caption };
}

export async function detectPageArchetype(page: Page): Promise<PageArchetype> {
	const dataRows = await countDataTableRows(page);
	if (dataRows > 0) return 'tableCrud';

	const hasTable = (await page.locator(`${WORK_AREA} table`).count()) > 0;
	if (hasTable) {
		const loading =
			(await page.locator(`${WORK_AREA} table tbody .loading-spinner`).count()) > 0;
		const hasThead = (await page.locator(`${WORK_AREA} table thead`).count()) > 0;
		const bodyText = await page.locator(WORK_AREA).first().innerText().catch(() => '');
		const showingPopulated = /Showing \d+-\d+ of [1-9]\d*/.test(bodyText);
		if (!loading && hasThead && (showingPopulated || dataRows > 0)) return 'tableCrud';
	}

	const scope = page.locator(WORK_AREA).first();
	const hasCard = (await scope.locator('.wash-card').count()) > 0;
	const hasFormControls =
		(await scope.locator('input, select, textarea').count()) > 2;
	if (hasCard || hasFormControls) return 'formOverview';

	return 'dashboard';
}

async function findAddButton(page: Page) {
	const candidates = [
		page.getByRole('button', { name: /^add$/i }),
		page.locator(`${WORK_AREA} button`).filter({ hasText: /^add$/i }),
		page.locator(`${WORK_AREA} .wash-btn-primary`).filter({ hasText: /add/i })
	];
	for (const loc of candidates) {
		const first = loc.first();
		if (await first.isVisible().catch(() => false)) return first;
	}
	return null;
}

async function dismissOverlay(page: Page) {
	const cancel = page.getByRole('button', { name: /cancel|close|back/i }).first();
	if (await cancel.isVisible().catch(() => false)) {
		await cancel.click().catch(() => {});
		await page.waitForTimeout(300);
	}
}

function firstDataRowActionButtons(page: Page) {
	return page
		.locator(`${WORK_AREA} tbody tr`)
		.filter({ has: page.locator('td:nth-child(2)') })
		.first()
		.locator('.menzies-table-actions-col button');
}

async function captureTableCrudShots(
	page: Page,
	dir: string,
	screenTitle: string,
	tableWait: TableWaitOptions
): Promise<ShotResult[]> {
	await waitForTableSettled(page, tableWait);

	const shots: ShotResult[] = [];
	shots.push(await shot(page, dir, 'step-01-list.png', `${screenTitle} list (${VIEWPORT.width}x${VIEWPORT.height})`));

	const addBtn = await findAddButton(page);
	if (addBtn) {
		await addBtn.click();
		await waitForDialogSettled(page);
		shots.push(await shot(page, dir, 'step-02-create-open.png', 'Add / create opened'));

		const dialog = page.locator('dialog[open]').last();
		if (await dialog.isVisible().catch(() => false)) {
			await waitForDialogSettled(page);
			shots.push(
				await shot(page, dir, 'step-03-create-form.png', 'Create form (required fields marked with *)')
			);
		} else {
			shots.push(await shot(page, dir, 'step-03-create-form.png', 'Create area'));
		}
		await dismissOverlay(page);
		await waitForTableSettled(page, tableWait).catch(() => {});
	}

	const rowEdit = firstDataRowActionButtons(page).nth(1);
	if (await rowEdit.isVisible().catch(() => false)) {
		await rowEdit.click().catch(() => {});
		await waitForDialogSettled(page);
		if (!(await page.locator('dialog[open]').isVisible().catch(() => false))) {
			shots.push(await shot(page, dir, 'step-04-edit.png', 'Edit a row'));
		} else {
			shots.push(await shot(page, dir, 'step-04-edit.png', 'Edit form'));
			await dismissOverlay(page);
		}
	}

	const deleteBtn = firstDataRowActionButtons(page).nth(2);
	if (await deleteBtn.isVisible().catch(() => false)) {
		await deleteBtn.click().catch(() => {});
		await waitForDialogSettled(page);
		const confirm = page.getByRole('button', { name: /delete|confirm|yes/i }).first();
		if (await confirm.isVisible().catch(() => false)) {
			shots.push(
				await shot(
					page,
					dir,
					'step-05-delete-confirm.png',
					'Delete confirmation (cancel unless you intend to remove data)'
				)
			);
			await page.keyboard.press('Escape').catch(() => {});
			await page.getByRole('button', { name: /cancel|no|close/i }).first().click().catch(() => {});
		}
	}

	return shots;
}

export async function captureCrudWorkflowShots(
	page: Page,
	slug: string,
	screenTitle: string,
	recipe?: Recipe
): Promise<ShotResult[]> {
	const dir = join(CAPTURE_ASSET_DIR, slug);
	const { mkdirSync } = await import('node:fs');
	mkdirSync(dir, { recursive: true });

	const tableWait: TableWaitOptions = {
		waitApiPath: recipe?.waitApiPath,
		minTableRows: recipe?.minTableRows
	};

	await waitForTableSettled(page, tableWait);

	const archetype = await detectPageArchetype(page);
	if (archetype === 'tableCrud') {
		return captureTableCrudShots(page, dir, screenTitle, tableWait);
	}

	const overviewCaption =
		archetype === 'formOverview'
			? `${screenTitle} (${VIEWPORT.width}x${VIEWPORT.height}, module bar and form)`
			: `${screenTitle} overview (${VIEWPORT.width}x${VIEWPORT.height})`;

	return [await shot(page, dir, 'step-01-overview.png', overviewCaption)];
}
