<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPages,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		(pathnameForPageMatch() ?? '')
			.replace(/\/+$/, '')
			.replace(/\/+/g, '/') || '/'
	);
	/** Walk-in external sales does not use visit context; hide selector and skip visit↔URL sync. */
	const isExternalMedOrderPage = $derived(
		currentPath.includes('medication-order/external-sales')
	);
	const hospitalId = $derived(page.params.hospital_id);
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

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
		const base = medoraHospitalPageUrl(hospitalId, pageUrl);
		if (String(pageUrl).includes('external-sales')) {
			return base;
		}
		const vid = VisitState.visitId;
		return vid ? `${base}?visitId=${vid}` : base;
	}

	$effect(() => {
		if (isExternalMedOrderPage) return;
		const urlVisitId = page.url.searchParams.get('visitId') ?? '';
		if (
			urlVisitId &&
			urlVisitId !== untrack(() => VisitState.visitId)
		) {
			VisitState.visitId = urlVisitId;
		} else if (!urlVisitId && VisitState.visitId) {
			const vid = VisitState.visitId;
			untrack(() => {
				const search = new URLSearchParams(page.url.search);
				search.set('visitId', vid);
				const base = page.url.pathname;
				const url = `${base}?${search.toString()}`;
				routerUtil.replaceRoute(url);
			});
		}
	});

	const selectedVisitId = $derived(VisitState.visitId);

	function handleVisitSelected(data: {
		visitId: number;
		patientName: string;
	}) {
		VisitState.select(data);
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
		VisitState.reset();
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

{#if isEmbed}
	{@render children()}
{:else}
	<div class="staff-subnav-wrapper">
		{#if !isExternalMedOrderPage}
			<LVisitInfoBar
				visitId={selectedVisitId}
				{hospitalId}
				onVisitSelected={handleVisitSelected}
				onVisitReset={handleVisitReset}
			/>
		{/if}

		{#if subPages.length > 0}
			<div role="tablist" class="staff-subnav-tabs">
				{#each subPages as sub (sub.id)}
					<button
						type="button"
						role="tab"
						class="staff-subnav-tab"
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

		<div class="staff-subnav-content">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.staff-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.staff-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.staff-subnav-tab {
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
	.staff-subnav-tab:hover {
		opacity: 1;
	}
	.staff-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.staff-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
