import { replaceState } from '$app/navigation';
import { page } from '$app/state';

/** Same-page `?visitId=` update so visit-scoped layouts stop reverting VisitState. */
export function replaceCurrentRouteVisitId(visitId: string): void {
	const next = new URL(page.url);
	next.searchParams.set('visitId', visitId);
	const target = `${next.pathname}${next.search}${next.hash}`;
	replaceState(target, page.state);
}