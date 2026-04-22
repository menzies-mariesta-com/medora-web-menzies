<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPages,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		pathnameForPageMatch().replace(/\/$/, '') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		return hekaHospitalPageUrl(hospitalId, pageUrl);
	}
</script>

{#if isEmbed}
	{@render children()}
{:else if subPages.length > 0}
	<div class="staff-subnav-wrapper">
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
					{sub.name ?? 'Untitled'}
				</button>
			{/each}
		</div>
		<div class="staff-subnav-content">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
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
		font: inherit;
		padding: 0.5rem 1rem;
		margin-bottom: -1px;
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
