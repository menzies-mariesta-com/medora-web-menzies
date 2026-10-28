<script lang="ts">
	import { page } from '$app/state';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import {
		getPageData,
		getSubPagesForPageUrl,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const hospitalId = $derived(page.params.hospital_id);
	const currentPath = $derived(
		(pathnameForPageMatch() ?? '')
			.replace(/\/+$/, '')
			.replace(/\/+/g, '/') || '/'
	);

	const billingTabs = $derived.by(() => {
		const bill = getPageData().find(
			(p) =>
				(p.pageUrl ?? '').replace(/\/$/, '') ===
				WebRoutesEnum.MEDORA_HOME_BILLING_BILL
		);
		if (!bill) return [];
		return [
			bill,
			...getSubPagesForPageUrl(WebRoutesEnum.MEDORA_HOME_BILLING_BILL)
		];
	});

	const showBillingTabs = $derived(
		billingTabs.length > 0 &&
			billingTabs.some((tab) => pathMatches(tab.pageUrl))
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
		const search = new SvelteURLSearchParams();
		const vid = VisitState.visitId;
		if (vid) search.set('visitId', vid);
		const q = search.toString();
		return q ? `${base}?${q}` : base;
	}

	// Keep VisitState <-> URL (?visitId=) in sync, same as EMR modules.
	$effect(() => {
		const urlVisitId = page.url.searchParams.get('visitId') ?? '';
		if (
			urlVisitId &&
			urlVisitId !== untrack(() => VisitState.visitId)
		) {
			VisitState.visitId = urlVisitId;
		} else if (!urlVisitId && VisitState.visitId) {
			const vid = VisitState.visitId;
			untrack(() => {
				const search = new SvelteURLSearchParams(page.url.search);
				search.set('visitId', vid);
				const base = page.url.pathname;
				const url = `${base}?${search.toString()}`;
				routerUtil.replaceRoute(url);
			});
		}
	});

	const selectedVisitId = $derived(VisitState.visitId);

	function handleVisitSelected(data: {
		visitId: string;
		patientName: string;
	}) {
		VisitState.select(data);
		const search = new SvelteURLSearchParams(page.url.search);
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
		const search = new SvelteURLSearchParams(page.url.search);
		search.delete('visitId');
		const base = page.url.pathname;
		const url =
			search.toString().length > 0
				? `${base}?${search.toString()}`
				: base;
		routerUtil.replaceRoute(url);
	}
</script>

<div class="billing-wrapper">
	<LVisitInfoBar
		visitId={selectedVisitId}
		{hospitalId}
		onVisitSelected={handleVisitSelected}
		onVisitReset={handleVisitReset}
	/>
	{#if showBillingTabs}
		<div role="tablist" class="billing-subnav-tabs">
			{#each billingTabs as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="billing-subnav-tab"
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
	<div class="billing-content">
		{@render children()}
	</div>
</div>

<style>
	.billing-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.billing-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.billing-subnav-tab {
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
	.billing-subnav-tab:hover {
		opacity: 1;
	}
	.billing-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.billing-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
