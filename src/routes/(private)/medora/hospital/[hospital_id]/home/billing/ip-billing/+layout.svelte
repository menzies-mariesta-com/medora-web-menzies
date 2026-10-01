<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPages,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		pathnameForPageMatch().replace(/\/$/, '') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		return medoraHospitalPageUrl(hospitalId, pageUrl);
	}
</script>

{#if subPages.length > 0}
	<div class="ip-billing-subnav-wrapper">
		<div role="tablist" class="ip-billing-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="ip-billing-subnav-tab"
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
		<div class="ip-billing-subnav-content">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.ip-billing-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.ip-billing-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.ip-billing-subnav-tab {
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
	.ip-billing-subnav-tab:hover {
		opacity: 1;
	}
	.ip-billing-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.ip-billing-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
