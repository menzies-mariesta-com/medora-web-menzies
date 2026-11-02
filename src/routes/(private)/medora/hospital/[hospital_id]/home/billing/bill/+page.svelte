<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import LBillingBillPage from '$lib/component/own/local/private/medora/billing/LBillingBillPage.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { fetchVisitTypeIdForBilling } from '$lib/tool/billing/billing-api-segment.util';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(VisitState.visitId);

	let visitTypeId = $state<number | null>(null);
	let segmentLoading = $state(false);

	const billPageKey = $derived(`${visitId ?? ''}:${visitTypeId ?? ''}`);

	$effect(() => {
		const id = parseUuid(visitId);
		const hid = hospitalId.trim();
		if (!id || !hid) {
			visitTypeId = null;
			segmentLoading = false;
			return;
		}
		let cancelled = false;
		segmentLoading = true;
		void fetchVisitTypeIdForBilling({ hospitalId: hid, visitId: id })
			.then((typeId) => {
				if (!cancelled) visitTypeId = typeId;
			})
			.catch(() => {
				if (!cancelled) visitTypeId = null;
			})
			.finally(() => {
				if (!cancelled) segmentLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if segmentLoading && visitId && visitTypeId == null}
	<p class="text-sm text-base-content/70">Loading visit billing context…</p>
{:else}
	{#key billPageKey}
		<LBillingBillPage {visitTypeId} />
	{/key}
{/if}
