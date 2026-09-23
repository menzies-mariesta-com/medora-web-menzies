<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { BedRow, WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { IpdTransferDialogState } from '$lib/state/ipd-transfer-dialog.state.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const censusApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/ipd/census`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master`
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/bed-master`
			: ''
	);

	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);
	let wardId = $state('');
	let bedId = $state('');
	let remark = $state('');
	let isSubmitting = $state(false);

	const wardOptions = $derived(
		wards.map((w) => ({ value: String(w.id), label: w.name }))
	);
	const bedOptions = $derived(
		beds.map((b) => ({ value: String(b.id), label: b.name }))
	);

	$effect(() => {
		if (!wardApi) return;
		const branchId = IpdTransferDialogState.branchId;
		const qs = new URLSearchParams({ active: '1' });
		if (branchId) qs.set('branchId', branchId);
		fetch(`${wardApi}?${qs}`, { credentials: 'include' })
			.then(async (res) => {
				if (res.ok) wards = (await res.json()) as WardRow[];
			})
			.catch(() => {});
	});

	$effect(() => {
		const wid = Number(wardId);
		bedId = '';
		if (!bedApi || !Number.isFinite(wid) || wid <= 0) {
			beds = [];
			return;
		}
		fetch(`${bedApi}?free=1&wardId=${wid}`, { credentials: 'include' })
			.then(async (res) => {
				if (res.ok) beds = (await res.json()) as BedRow[];
				else beds = [];
			})
			.catch(() => {
				beds = [];
			});
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const admissionId = IpdTransferDialogState.admissionId;
		const toWardId = Number(wardId);
		const toBedId = Number(bedId);
		if (!admissionId || !toWardId || !toBedId || !censusApi) return;
		isSubmitting = true;
		try {
			const res = await fetch(censusApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'transfer',
					admissionId,
					toWardId,
					toBedId,
					remark: remark.trim() || null
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast('Transferred', StatusColorEnum.SUCCESS);
			confirm(await res.json());
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Transfer failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<label class="label-ink text-sm font-medium" for="xfer-ward"
		>To ward</label
	>
	<WashSelect
		id="xfer-ward"
		placeholder="Select ward"
		options={wardOptions}
		bind:value={wardId}
		className="w-full"
	/>
	<label class="label-ink text-sm font-medium" for="xfer-bed"
		>To bed</label
	>
	<WashSelect
		id="xfer-bed"
		placeholder="Select free bed"
		options={bedOptions}
		bind:value={bedId}
		className="w-full"
		disabled={!wardId || bedOptions.length === 0}
	/>
	<div class="modal-action flex justify-end gap-2">
		<WashButton type="button" className="btn" onClick={() => cancel()}
			>Cancel</WashButton
		>
		<WashButton
			type="submit"
			className="btn btn-primary"
			loading={isSubmitting}
			disabled={!wardId || !bedId || isSubmitting}
			>Transfer</WashButton
		>
	</div>
</form>
