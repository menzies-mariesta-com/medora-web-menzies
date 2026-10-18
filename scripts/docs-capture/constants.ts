import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS_CAPTURE_ASSET_DIR_REL } from '../../src/lib/docs/capture-paths.ts';

const captureDir = dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = join(captureDir, '..', '..');
export const MANIFEST_PATH = join(PROJECT_ROOT, 'src/lib/docs/manifest.json');
export const CONTENT_DIR = join(PROJECT_ROOT, 'src/lib/docs/content/workflows');
export const CAPTURE_ASSET_DIR = join(PROJECT_ROOT, DOCS_CAPTURE_ASSET_DIR_REL);
export const CHECKPOINT_PATH = join(PROJECT_ROOT, 'scripts/.docs-capture-checkpoint.json');
export const STORAGE_STATE_PATH = join(PROJECT_ROOT, 'scripts/.docs-capture-storage.json');
export const RECIPES_PATH = join(captureDir, 'workflow-recipes.json');

/** Testing Hospital 1 (docs capture demo). Override with DOCS_CAPTURE_HOSPITAL_ID. */
export const DEFAULT_DOCS_DEMO_HOSPITAL_ID = '01a0cd12-1af6-7839-a4ce-6d834497a0ba';

export const DEFAULT_HOSPITAL_ID =
	process.env.DOCS_CAPTURE_HOSPITAL_ID?.trim() ||
	process.env.SEED_HOSPITAL_ID?.trim() ||
	DEFAULT_DOCS_DEMO_HOSPITAL_ID;

function parseViewportDimension(raw: string | undefined, fallback: number): number {
	const n = Number.parseInt(raw ?? '', 10);
	return Number.isFinite(n) && n >= 320 ? n : fallback;
}

export const VIEWPORT = {
	width: parseViewportDimension(process.env.DOCS_CAPTURE_VIEWPORT_WIDTH, 1920),
	height: parseViewportDimension(process.env.DOCS_CAPTURE_VIEWPORT_HEIGHT, 1080)
};
