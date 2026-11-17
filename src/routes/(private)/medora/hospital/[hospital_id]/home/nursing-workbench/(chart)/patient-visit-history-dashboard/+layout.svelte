<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPagesForPageUrl,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const DASHBOARD_SECTION_URL =
		'/medora/home/nursing-workbench/patient-visit-history-dashboard';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPagesForPageUrl(DASHBOARD_SECTION_URL));
	const currentPath = $derived(
		pathnameForPageMatch().replace(/\/$/, '') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u;
	}

	/** Keep `?visitId=` on tab switches; drop it on sections that never use it. */
	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		const base = medoraHospitalPageUrl(hospitalId, pageUrl);
		const visitId = page.url.searchParams.get('visitId');
		return visitId ? `${base}?visitId=${visitId}` : base;
	}
</script>

{#if isEmbed || subPages.length === 0}
	{#if children}
		{@render children()}
	{/if}
{:else}
	<div class="visit-dashboard-subnav-wrapper">
		<div role="tablist" class="visit-dashboard-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="visit-dashboard-subnav-tab"
					class:active={pathMatches(sub.pageUrl)}
					aria-selected={pathMatches(sub.pageUrl)}
					onclick={() => {
						const url = navUrl(sub.pageUrl);
						if (url) routerUtil.replaceRoute(url);
					}}
				>
					{sub.name ?? m.untitled()}
				</button>
			{/each}
		</div>
		<div class="visit-dashboard-subnav-content">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	.visit-dashboard-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.visit-dashboard-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.visit-dashboard-subnav-tab {
		appearance: none;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.5rem 1rem;
		margin-bottom: -1px;
		font: inherit;
		color: inherit;
		cursor: pointer;
		opacity: 0.7;
	}
	.visit-dashboard-subnav-tab:hover {
		opacity: 1;
	}
	.visit-dashboard-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.visit-dashboard-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
