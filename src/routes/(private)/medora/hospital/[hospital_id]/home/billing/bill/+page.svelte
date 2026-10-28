<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import LBillingBillPage from '$lib/component/own/local/private/medora/billing/LBillingBillPage.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		billingApiSegmentForVisitType,
		fetchVisitTypeIdForBilling,
		type BillingApiSegment
	} from '$lib/tool/billing/billing-api-segment.util';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(VisitState.visitId);

	let visitTypeId = $state<number | null>(null);
	let segmentLoading = $state(false);

	const billingApiSegment = $derived.by((): BillingApiSegment => {
		if (!visitId) return 'op-billing';
		if (segmentLoading && visitTypeId == null) return 'op-billing';
		return billingApiSegmentForVisitType(visitTypeId);
	});

	const billPageKey = $derived(
		`${billingApiSegment}:${visitId ?? ''}:${visitTypeId ?? ''}`
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

{#key billPageKey}
	<LBillingBillPage {billingApiSegment} />
{/key}
