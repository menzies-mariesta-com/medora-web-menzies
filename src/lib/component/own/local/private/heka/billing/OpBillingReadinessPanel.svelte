<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import type {
		OpBillingCloseBlockReason,
		OpBillingReadiness
	} from '$lib/model/type/heka/op-billing.type';
	import { m } from '$lib/paraglide/messages';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const msg = m as Record<
		string,
		(inputs?: Record<string, unknown>) => string
	>;

	let {
		readiness,
		hospitalId,
		visitId,
		draftSubtotal,
		isClosed
	}: {
		readiness: OpBillingReadiness | null;
		hospitalId: string;
		visitId: string;
		draftSubtotal: number;
		isClosed: boolean;
	} = $props();

	const routerUtil = new RouterUtil();

	const servicesComplete = $derived(
		readiness != null &&
			readiness.nursingIncompleteCount === 0 &&
			(readiness.totalServiceLines === 0 ||
				readiness.nursingCompleteCount === readiness.totalServiceLines)
	);

	const billLinesOk = $derived(
		readiness != null && readiness.pendingBillLineCount > 0
	);

	function blockReasonMessage(
		key: OpBillingCloseBlockReason
	): string {
		switch (key) {
			case 'nursing_incomplete':
				return m.op_billing_bill_close_blocked_nursing();
			case 'no_billable_lines':
				return msg.op_billing_bill_close_blocked_no_lines();
			case 'already_closed':
				return m.op_billing_bill_already_closed_tooltip();
			default:
				return '';
		}
	}

	function goToNursingComplete() {
		if (!hospitalId || !visitId) return;
		routerUtil.goToRoute(
			`/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?visitId=${visitId}`
		);
	}
</script>

{#if readiness}
	<section
		class="rounded-box border border-base-300 bg-base-100/80 p-4 shadow-sm"
	>
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-sm font-semibold">
				{msg.op_billing_readiness_title()}
			</h3>
			<span
				class="d-badge d-badge-sm {readiness.canCloseBill && !isClosed
					? 'd-badge-success'
					: 'd-badge-warning'}"
			>
				{readiness.canCloseBill && !isClosed
					? msg.op_billing_readiness_ready()
					: msg.op_billing_readiness_not_ready()}
			</span>
		</div>

		<ul class="space-y-2 text-sm">
			<li class="flex flex-wrap items-start justify-between gap-2">
				<span class="text-base-content/80">
					{msg.op_billing_readiness_services({
						done: readiness.nursingCompleteCount,
						total: readiness.totalServiceLines
					})}
				</span>
				<span
					class={servicesComplete
						? 'font-medium text-success'
						: 'font-medium text-warning'}
				>
					{servicesComplete ? '✓' : '…'}
				</span>
			</li>

			<li class="flex flex-wrap items-start justify-between gap-2">
				<span class="text-base-content/80">
					{#if readiness.medicationLineCount > 0}
						{msg.op_billing_readiness_medication_count({
							count: readiness.medicationLineCount
						})}
					{:else}
						{msg.op_billing_readiness_medication_none()}
					{/if}
				</span>
				<span class="font-medium text-base-content/60">—</span>
			</li>

			<li class="flex flex-wrap items-start justify-between gap-2">
				<span class="text-base-content/80">
					{msg.op_billing_readiness_bill_lines({
						count: readiness.pendingBillLineCount
					})}
					{#if draftSubtotal > 0}
						<span class="text-base-content/60">
							· {formatMoneyAmount(draftSubtotal)}
						</span>
					{/if}
				</span>
				<span
					class={billLinesOk
						? 'font-medium text-success'
						: 'font-medium text-warning'}
				>
					{billLinesOk ? '✓' : '…'}
				</span>
			</li>
		</ul>

		{#if readiness.blockReasonKey && !isClosed}
			<p class="mt-3 text-xs text-warning">
				{blockReasonMessage(readiness.blockReasonKey)}
			</p>
		{/if}

		{#if readiness.nursingIncompleteCount > 0 && !isClosed}
			<p class="mt-3 text-xs text-base-content/70">
				{msg.op_billing_readiness_nursing_hint()}
			</p>
			<div class="mt-2">
				<DaisyUiButton
					className="d-btn-outline d-btn-sm"
					onClick={() => goToNursingComplete()}
				>
					{msg.op_billing_readiness_open_nursing()}
				</DaisyUiButton>
			</div>
		{/if}
	</section>
{/if}
