<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import LVisitPickerGate from '$lib/component/own/local/private/medora/visit/LVisitPickerGate.svelte';
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const hospitalId = $derived(page.params.hospital_id);
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);
	// Gate on the URL, not session state: server and client agree, so no hydration flip.
	const hasUrlVisit = $derived(
		Boolean(page.url.searchParams.get('visitId')?.trim())
	);

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
	{#if hasUrlVisit}
		<LVisitInfoBar
			visitId={selectedVisitId}
			{hospitalId}
			listScope="hospital"
			onVisitSelected={handleVisitSelected}
			onVisitReset={handleVisitReset}
		/>
		<div
			class="billing-content"
			class:billing-content-embed={isEmbed}
		>
			{#if children}
				{@render children()}
			{/if}
		</div>
	{:else}
		<LVisitPickerGate
			listScope="hospital"
			onVisitSelected={handleVisitSelected}
		/>
	{/if}
</div>

<style>
	.billing-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.billing-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
	.billing-content-embed {
		padding: 0;
	}
</style>
