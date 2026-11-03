<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import LBillingBillPage from '$lib/component/own/local/private/medora/billing/LBillingBillPage.svelte';
	import LBillingScopePanel from '$lib/component/own/local/private/medora/billing/LBillingScopePanel.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { fetchVisitTypeIdForBilling } from '$lib/tool/billing/billing-api-segment.util';
	import type { OpenBillVisitDetail } from '$lib/tool/billing/billing-open-bills-batch.util.svelte';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(VisitState.visitId);

	let visitTypeId = $state<number | null>(null);
	let segmentLoading = $state(false);
	let billingViewAll = $state(false);
	let openBillDetails = $state<OpenBillVisitDetail[]>([]);
	let openBillDetailsLoading = $state(false);
	let openBillsGrandTotal = $state('0');

	const billPageKey = $derived(
		`${visitId ?? ''}:${visitTypeId ?? ''}:${billingViewAll ? 'all' : 'one'}`
	);

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
	<LBillingScopePanel
		{hospitalId}
		{visitId}
		bind:billingViewAll
		bind:openBillDetails
		bind:openBillDetailsLoading
		bind:openBillsGrandTotal
	/>
	{#key billPageKey}
		<LBillingBillPage
			bind:billingViewAll
			{visitTypeId}
		bind:openBillDetails
		bind:openBillsGrandTotal
		{openBillDetailsLoading}
		/>
	{/key}
{/if}
