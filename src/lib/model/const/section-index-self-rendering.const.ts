/**
 * Section-index pages that render their own content even though they have child
 * pages. The generic "index → first child" redirect must skip them, or the tab
 * for the parent can never stay active.
 *
 * Imported by both the server helper (`medora-section-index-redirect.server`)
 * and the client helper (`page.state.svelte`), so it stays free of `$lib/server`.
 */
export const SECTION_INDEX_SELF_RENDERING_PAGE_URLS: ReadonlySet<string> = new Set([
	// Dashboard renders the journal view itself; Journal / Visual sit beside it as tabs.
	'/medora/home/nursing-workbench/patient-visit-history-dashboard'
]);
