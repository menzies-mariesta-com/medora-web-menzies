import { captureCrudWorkflowShots } from './crud-capture.ts';
import type { Recipe } from './navigate.ts';

export type ShotResult = {
	fileName: string;
	caption: string;
};

export async function captureWorkflowShots(
	page: import('@playwright/test').Page,
	slug: string,
	screenTitle: string,
	recipe?: Recipe
): Promise<ShotResult[]> {
	return captureCrudWorkflowShots(page, slug, screenTitle, recipe);
}
