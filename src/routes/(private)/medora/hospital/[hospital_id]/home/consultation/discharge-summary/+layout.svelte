<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const hospitalId = $derived(page.params.hospital_id);
	const selectedVisitId = $derived(VisitState.visitId);

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
				routerUtil.replaceRoute(
					`${page.url.pathname}?${search.toString()}`
				);
			});
		}
	});

	function handleVisitSelected(data: {
		visitId: number;
		patientName: string;
	}) {
		VisitState.select(data);
		const search = new URLSearchParams(page.url.search);
		search.set('visitId', String(data.visitId));
		const qs = search.toString();
		routerUtil.replaceRoute(
			qs ? `${page.url.pathname}?${qs}` : page.url.pathname
		);
	}

	function handleVisitReset() {
		VisitState.reset();
		const search = new URLSearchParams(page.url.search);
		search.delete('visitId');
		const qs = search.toString();
		routerUtil.replaceRoute(
			qs ? `${page.url.pathname}?${qs}` : page.url.pathname
		);
	}
</script>

<LVisitInfoBar
	visitId={selectedVisitId}
	{hospitalId}
	onVisitSelected={handleVisitSelected}
	onVisitReset={handleVisitReset}
/>
{@render children()}
