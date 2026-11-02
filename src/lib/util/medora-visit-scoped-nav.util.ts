import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { isNursingChartPath } from '$lib/tool/nursing/nursing-worklist.util';

const VISIT_SCOPED_PREFIXES = [
	WebRoutesEnum.MEDORA_HOME_CONSULTATION_EMR,
	WebRoutesEnum.MEDORA_HOME_CONSULTATION_CPOE,
	WebRoutesEnum.MEDORA_HOME_MEDICATION_ORDER,
	WebRoutesEnum.MEDORA_HOME_BILLING,
	'/medora/home/consultation/procedures',
	'/medora/home/consultation/operative-notes',
	'/medora/home/consultation/discharge-summary',
	'/medora/home/consultation/results'
] as const;

/** Logical `pageUrl` paths where `?visitId=` is meaningful (EMR, billing ops, etc.). */
export function isMedoraVisitScopedPagePath(pageUrl: string | null | undefined): boolean {
	const path = (pageUrl ?? '').replace(/\/+$/, '') || '/';
	if (isNursingChartPath(path)) return true;
	return VISIT_SCOPED_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`)
	);
}

/**
 * Query string to append when opening a module menu page.
 * Avoids copying `visitId` onto admin/setup routes (module bar used to pass full `page.url.search`).
 */
export function searchForMedoraModuleLink(
	targetPageUrl: string | null | undefined,
	currentSearch: string
): string {
	const raw = currentSearch.startsWith('?')
		? currentSearch.slice(1)
		: currentSearch;
	if (!raw.trim()) return '';

	const incoming = new URLSearchParams(raw);
	const out = new URLSearchParams();

	const embed = incoming.get('embed');
	if (embed === '1') out.set('embed', '1');

	if (isMedoraVisitScopedPagePath(targetPageUrl)) {
		const visitId = incoming.get('visitId');
		if (visitId) out.set('visitId', visitId);
	}

	const serialized = out.toString();
	return serialized ? `?${serialized}` : '';
}
