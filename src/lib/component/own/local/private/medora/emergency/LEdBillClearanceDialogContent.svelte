<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		visitId: string;
		onClosed?: () => void | Promise<void>;
	};

	let { confirm, cancel, visitId, onClosed }: Props = $props();

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/er-billing/visit-lines`
			: ''
	);

	let loading = $state(true);
	let closing = $state(false);
	let readiness = $state<{
		canCloseBill?: boolean;
		blockReasonKey?: string | null;
	} | null>(null);
	let billingStatus = $state<string | null>(null);

	async function load() {
		if (!api) return;
		loading = true;
		try {
			const res = await fetch(
				`${api}?visitId=${encodeURIComponent(visitId)}`,
				{ credentials: 'include' }
			);
			const data = (await res.json()) as {
				readiness?: { canCloseBill?: boolean; blockReasonKey?: string | null };
				billing?: { statusTaggingId?: number } | null;
			};
			readiness = data.readiness ?? null;
			billingStatus =
				data.billing != null ? String(data.billing.statusTaggingId ?? '') : null;
		} finally {
			loading = false;
		}
	}

	async function closeBill() {
		if (!api || closing) return;
		closing = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'close', visitId })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.ed_reg_bill_closed?.() ?? 'OP bill closed',
				StatusColorEnum.SUCCESS
			);
			await onClosed?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Close failed',
				StatusColorEnum.ERROR
			);
		} finally {
			closing = false;
		}
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

<div class="space-y-3">
	{#if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else}
		<p class="text-sm">
			{msg.ed_reg_bill_clearance_hint?.() ??
				'Review OP billing readiness and close the bill when allowed.'}
		</p>
		{#if readiness?.canCloseBill}
			<p class="text-success text-sm">
				{msg.ed_reg_bill_can_close?.() ?? 'Bill can be closed.'}
			</p>
		{:else}
			<p class="text-warning text-sm">
				{msg.ed_reg_bill_blocked?.() ??
					`Cannot close: ${readiness?.blockReasonKey ?? 'unknown'}`}
			</p>
		{/if}
	{/if}
	<div class="flex justify-end gap-2">
		<WashButton
			type="button"
			className="btn btn-ghost cursor-pointer"
			onClick={() => cancel()}
		>
			{m.cancel?.() ?? 'Cancel'}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-primary cursor-pointer"
			loading={closing}
			disabled={closing || !readiness?.canCloseBill}
			aria-busy={closing}
			onClick={() => void closeBill()}
		>
			{msg.ed_reg_bill_close_btn?.() ?? 'Close OP bill'}
		</WashButton>
	</div>
</div>
