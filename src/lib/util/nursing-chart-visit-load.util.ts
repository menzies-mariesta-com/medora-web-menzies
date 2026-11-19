/** Aborted fetch or effect superseded — not “visit not found”. */
export function isSupersededVisitFetch(
	err: unknown,
	isCancelled?: () => boolean
): boolean {
	if (isCancelled?.()) return true;
	return err instanceof DOMException && err.name === 'AbortError';
}

export type NursingChartVisitLoadOutcome =
	| 'ok'
	| 'not_found'
	| 'aborted'
	| 'error';

/** When to set `lastLoadedVisitKey` so a failed/aborted refresh can retry. */
export function shouldCommitNursingChartVisitLoad(
	outcome: NursingChartVisitLoadOutcome
): boolean {
	return outcome === 'ok' || outcome === 'not_found';
}