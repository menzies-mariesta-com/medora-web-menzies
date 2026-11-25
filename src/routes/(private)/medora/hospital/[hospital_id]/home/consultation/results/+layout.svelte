<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import LVisitPickerGate from '$lib/component/own/local/private/medora/visit/LVisitPickerGate.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const hospitalId = $derived(page.params.hospital_id);
	const selectedVisitId = $derived(VisitState.visitId);
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
				routerUtil.replaceRoute(
					`${page.url.pathname}?${search.toString()}`
				);
			});
		}
	});

	function handleVisitSelected(data: {
		visitId: string;
		patientName: string;
	}) {
		VisitState.select(data);
		const search = new SvelteURLSearchParams(page.url.search);
		search.set('visitId', String(data.visitId));
		const qs = search.toString();
		routerUtil.replaceRoute(
			qs ? `${page.url.pathname}?${qs}` : page.url.pathname
		);
	}

	function handleVisitReset() {
		VisitState.reset();
		const search = new SvelteURLSearchParams(page.url.search);
		search.delete('visitId');
		const qs = search.toString();
		routerUtil.replaceRoute(
			qs ? `${page.url.pathname}?${qs}` : page.url.pathname
		);
	}
</script>

{#if hasUrlVisit}
	<LVisitInfoBar
		visitId={selectedVisitId}
		{hospitalId}
		onVisitSelected={handleVisitSelected}
		onVisitReset={handleVisitReset}
	/>
	{#if children}
		{@render children()}
	{/if}
{:else}
	<LVisitPickerGate onVisitSelected={handleVisitSelected} />
{/if}
