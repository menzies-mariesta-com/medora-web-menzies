<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { BillingStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		visitId: string;
		visitNo?: string | null;
		patientName?: string | null;
		erBedLabel?: string | null;
		onDone?: () => void | Promise<void>;
	};

	let {
		confirm,
		cancel,
		visitId,
		visitNo = null,
		patientName = null,
		erBedLabel = null,
		onDone
	}: Props = $props();

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const billingApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/er-billing/visit-lines`
			: ''
	);
	const edApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emergency`
			: ''
	);

	let loading = $state(true);
	let submitting = $state(false);
	let billClosed = $state(false);
	let totalAmount = $state<string | null>(null);
	let dischargeRemarks = $state('');
	let retainErBed = $state(false);

	async function load() {
		if (!billingApi) return;
		loading = true;
		try {
			const res = await fetch(
				`${billingApi}?visitId=${encodeURIComponent(visitId)}`,
				{ credentials: 'include' }
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = (await res.json()) as {
				billing?: { statusTaggingId?: number; totalAmount?: string };
			};
			billClosed =
				data.billing?.statusTaggingId === BillingStatusTaggingEnum.CLOSED;
			totalAmount = data.billing?.totalAmount ?? null;
		} finally {
			loading = false;
		}
	}

	async function submitDischarge() {
		if (!edApi || submitting || !billClosed) return;
		submitting = true;
		try {
			const res = await fetch(edApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'discharge',
					visitId,
					dischargeRemarks: dischargeRemarks.trim() || null,
					retainErBedAfterDischarge: retainErBed
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.ed_reg_discharged_toast?.() ?? 'Patient discharged from ED',
				StatusColorEnum.SUCCESS
			);
			await onDone?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Discharge failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submitting = false;
		}
	}

	function openErBilling() {
		if (!hospitalId) return;
		const base = medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_BILLING_BILL
		);
		window.open(`${base}?visitId=${encodeURIComponent(visitId)}`, '_blank');
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

<div class="wash-form-stack space-y-3">
	{#if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else}
		<dl class="grid gap-1 text-sm">
			{#if patientName}
				<div><span class="opacity-70">Patient:</span> {patientName}</div>
			{/if}
			{#if visitNo}
				<div><span class="opacity-70">Visit:</span> {visitNo}</div>
			{/if}
			{#if erBedLabel}
				<div><span class="opacity-70">Bed:</span> {erBedLabel}</div>
			{/if}
			{#if totalAmount != null}
				<div>
					<span class="opacity-70">Bill total:</span>
					{totalAmount}
				</div>
			{/if}
		</dl>
		{#if billClosed}
			<p class="text-success text-sm">
				{msg.ed_discharge_bill_closed?.() ?? 'ED bill is closed.'}
			</p>
		{:else}
			<p class="text-warning text-sm">
				{msg.ed_discharge_bill_open?.() ??
					'Close the ED bill before discharge.'}
			</p>
			<WashButton
				type="button"
				className="btn btn-sm btn-primary cursor-pointer"
				onClick={() => openErBilling()}
			>
				{msg.ed_discharge_open_billing?.() ?? 'Open ED billing'}
			</WashButton>
		{/if}
		<label class="form-control w-full">
			<span class="label-text">
				{msg.ed_discharge_remarks_label?.() ?? 'Discharge remarks'}
			</span>
			<textarea
				class="textarea textarea-bordered w-full cursor-text"
				rows="3"
				bind:value={dischargeRemarks}
			></textarea>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-primary cursor-pointer"
				bind:checked={retainErBed}
			/>
			<span class="text-sm">
				{msg.ed_discharge_retain_bed?.() ??
					'Patient discharged but remains in bed (keep bed occupied)'}
			</span>
		</label>
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
			loading={submitting}
			disabled={submitting || loading || !billClosed}
			onClick={() => submitDischarge()}
		>
			{msg.ed_reg_menu_discharge?.() ?? 'Discharge'}
		</WashButton>
	</div>
</div>
