/** Tablist class names used by hospital sub-page +layout.svelte strips. */
const MEDORA_SUBNAV_TABLIST_SELECTOR =
	'.staff-subnav-tabs, .emr-subnav-tabs, .nursing-chart-tabs, .billing-subnav-tabs, .patient-subnav-tabs, .adt-subnav-tabs, .ed-subnav-tabs';

/** Keep the current sub-page tab visible inside horizontally scrollable strips. */
export function scrollMedoraSubnavActiveTabsIntoView(): void {
	if (typeof document === 'undefined') return;
	queueMicrotask(() => {
		for (const tablist of document.querySelectorAll(
			MEDORA_SUBNAV_TABLIST_SELECTOR
		)) {
			const active = tablist.querySelector<HTMLElement>(
				'[role="tab"].active'
			);
			if (!active) continue;
			active.scrollIntoView({
				inline: 'center',
				block: 'nearest',
				behavior: 'instant'
			});
		}
	});
}
