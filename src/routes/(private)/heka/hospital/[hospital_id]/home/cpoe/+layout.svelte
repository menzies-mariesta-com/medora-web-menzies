<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPages,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LVisitInfoBar from '$lib/component/local/private/heka/visit/LVisitInfoBar.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		(pathnameForPageMatch() ?? '')
			.replace(/\/+$/, '')
			.replace(/\/+/g, '/') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);
	const currentSearch = $derived(page.url.search);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		if (pageUrl == null || pageUrl === '') return false;
		const u =
			(pageUrl ?? '')
				.replace(/\/+$/, '')
				.replace(/\/+/g, '/')
				.trim() || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		const base = hekaHospitalPageUrl(hospitalId, pageUrl);
		return currentSearch ? `${base}${currentSearch}` : base;
	}

const selectedVisitId = $derived(
	page.url.searchParams.get('visitId') ?? ''
);

	function handleVisitSelected(data: {
		visitId: number;
		patientName: string;
	}) {
		const search = new URLSearchParams(page.url.search);
		search.set('visitId', String(data.visitId));
		const base = page.url.pathname;
		const url =
			search.toString().length > 0
				? `${base}?${search.toString()}`
				: base;
		routerUtil.replaceRoute(url);
	}

	function handleVisitReset() {
		const search = new URLSearchParams(page.url.search);
		search.delete('visitId');
		const base = page.url.pathname;
		const url =
			search.toString().length > 0
				? `${base}?${search.toString()}`
				: base;
		routerUtil.replaceRoute(url);
	}
</script>

<div class="emr-subnav-wrapper">
	<LVisitInfoBar
		visitId={selectedVisitId}
		{hospitalId}
		onVisitSelected={handleVisitSelected}
		onVisitReset={handleVisitReset}
	/>

	{#if subPages.length > 0}
		<div role="tablist" class="emr-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="emr-subnav-tab"
					class:active={pathMatches(sub.pageUrl)}
					onclick={() => {
						const url = navUrl(sub.pageUrl);
						if (url) routerUtil.replaceRoute(url);
					}}
				>
					{sub.name ?? m.untitled()}
				</button>
			{/each}
		</div>
	{/if}

	<div class="emr-subnav-content">
		{@render children()}
	</div>
</div>

<style>
	.emr-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.emr-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.emr-subnav-tab {
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
	.emr-subnav-tab:hover {
		opacity: 1;
	}
	.emr-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.emr-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>

