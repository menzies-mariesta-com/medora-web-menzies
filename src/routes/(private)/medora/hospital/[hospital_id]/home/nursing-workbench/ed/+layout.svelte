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
	import LEdVisitRequiredAlert from '$lib/component/own/local/private/medora/visit/LEdVisitRequiredAlert.svelte';
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		(pathnameForPageMatch() ?? '')
			.replace(/\/+$/, '')
			.replace(/\/+/g, '/') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);
	const isTrackBoardPage = $derived(
		currentPath.endsWith('/nursing-workbench/ed/track-board') ||
			currentPath.endsWith('/nursing-workbench/ed')
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
		const search = new URLSearchParams();
		const vid = VisitState.visitId;
		if (vid) search.set('visitId', vid);
		const q = search.toString();
		return q ? `${base}?${q}` : base;
	}

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
		visitId: string;
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
		VisitState.select(data);
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

{#if subPages.length > 0}
	<div class="ed-subnav-wrapper">
		<LVisitInfoBar
			visitId={selectedVisitId}
			{hospitalId}
			onVisitSelected={handleVisitSelected}
			onVisitReset={handleVisitReset}
		/>
		{#if isTrackBoardPage}
			<div role="tablist" class="ed-subnav-tabs">
				{#each subPages as sub (sub.id)}
					<button
						type="button"
						role="tab"
						class="ed-subnav-tab"
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
			<div class="ed-subnav-content">
				{@render children()}
			</div>
		{:else}
			<LEdVisitRequiredAlert
				hospitalId={typeof hospitalId === 'string' ? hospitalId : ''}
				visitId={selectedVisitId}
				message={msg.nursing_ed_visit_required?.() ??
					'ED nursing is for emergency visits only. Select an ED visit to continue.'}
			>
				<div role="tablist" class="ed-subnav-tabs">
					{#each subPages as sub (sub.id)}
						<button
							type="button"
							role="tab"
							class="ed-subnav-tab"
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
				<div class="ed-subnav-content">
					{@render children()}
				</div>
			</LEdVisitRequiredAlert>
		{/if}
	</div>
{:else}
	<div>
		{@render children()}
	</div>
{/if}

<style>
	.ed-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.ed-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.ed-subnav-tab {
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
	.ed-subnav-tab:hover {
		opacity: 1;
	}
	.ed-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.ed-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
