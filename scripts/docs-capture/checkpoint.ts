import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { CHECKPOINT_PATH } from './constants.ts';

export type CaptureCheckpoint = {
	completed: string[];
	updatedAt?: string;
	/** Slug to retry after auth / 2FA interrupt */
	pendingSlug?: string | null;
	/** Slugs that failed on data/UI (not auth) */
	failedSlugs?: string[];
	lastError?: string | null;
};

export function loadCheckpointData(): CaptureCheckpoint {
	if (!existsSync(CHECKPOINT_PATH)) {
		return { completed: [], pendingSlug: null, failedSlugs: [], lastError: null };
	}
	const data = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')) as CaptureCheckpoint;
	return {
		completed: data.completed ?? [],
		updatedAt: data.updatedAt,
		pendingSlug: data.pendingSlug ?? null,
		failedSlugs: data.failedSlugs ?? [],
		lastError: data.lastError ?? null
	};
}

export function saveCheckpointData(data: CaptureCheckpoint) {
	writeFileSync(
		CHECKPOINT_PATH,
		JSON.stringify(
			{
				...data,
				failedSlugs: data.failedSlugs ?? [],
				updatedAt: new Date().toISOString()
			},
			null,
			2
		),
		'utf8'
	);
}

export function markCompleted(slug: string, completed: Set<string>, failedSlugs: Set<string>) {
	completed.add(slug);
	failedSlugs.delete(slug);
	saveCheckpointData({
		completed: [...completed],
		failedSlugs: [...failedSlugs],
		pendingSlug: null,
		lastError: null
	});
}

export function markPendingAuth(slug: string, completed: Set<string>, error: string) {
	const data = loadCheckpointData();
	saveCheckpointData({
		completed: [...completed],
		failedSlugs: data.failedSlugs ?? [],
		pendingSlug: slug,
		lastError: error
	});
}

export function markFailed(
	slug: string,
	completed: Set<string>,
	failedSlugs: Set<string>,
	error: string
) {
	failedSlugs.add(slug);
	saveCheckpointData({
		completed: [...completed],
		failedSlugs: [...failedSlugs],
		pendingSlug: slug,
		lastError: error
	});
}
