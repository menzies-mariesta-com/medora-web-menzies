<script lang="ts">
	import { page } from '$app/state';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getSubPages } from '$lib/state/page.state.svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		page.url.pathname.replace(/\/$/, '') || '/'
	);
	const isEmbed = $derived(page.url.searchParams.get('embed') === '1');

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}
</script>

{#if isEmbed}
	{@render children()}
{:else if subPages.length > 0}
	<div class="patient-subnav-wrapper">
		<nav role="tablist" class="patient-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="patient-subnav-tab"
					class:active={pathMatches(sub.pageUrl)}
					onclick={() =>
						sub.pageUrl && routerUtil.replaceRoute(sub.pageUrl)}
				>
					{sub.name ?? 'Untitled'}
				</button>
			{/each}
		</nav>
		<div class="patient-subnav-content">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.patient-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.patient-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.patient-subnav-tab {
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
	.patient-subnav-tab:hover {
		opacity: 1;
	}
	.patient-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.patient-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>

