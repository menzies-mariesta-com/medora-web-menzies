<script lang="ts">
	/**
	 * Admit current OPD visit to IPD (same visit convert).
	 * Ward → free bed → optional notes; posts to nursing-workbench/ipd/census.
	 */
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { WardRow, BedRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AdmitToIpdDialogState } from '$lib/state/admit-to-ipd-dialog.state.svelte';

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
	let reasonNotes = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(false);

	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	);
	const bedOptions = $derived(
		beds.map((b) => {
			const base = b.code ? `${b.name} (${b.code})` : b.name;
			const room = b.roomName ? ` · ${b.roomName}` : '';
			const tariff =
				b.dailyTariff != null ? ` · ${b.dailyTariff}/day` : '';
			return { value: String(b.id), label: `${base}${room}${tariff}` };
		})
	);

	async function loadWards() {
		if (!wardApi) return;
		isLoading = true;
		try {
			const branchId = AdmitToIpdDialogState.branchId;
			const qs = new URLSearchParams({ active: '1' });
			if (branchId) qs.set('branchId', branchId);
			const res = await fetch(`${wardApi}?${qs}`, {
				credentials: 'include'
			});
			if (!res.ok) throw new Error(await res.text());
			wards = (await res.json()) as WardRow[];
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to load wards',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadFreeBeds(wid: number) {
		if (!bedApi || !wid) {
			beds = [];
			return;
		}
		const res = await fetch(
			`${bedApi}?free=1&wardId=${encodeURIComponent(String(wid))}`,
			{ credentials: 'include' }
		);
		if (!res.ok) {
			beds = [];
			return;
		}
		beds = (await res.json()) as BedRow[];
	}

	$effect(() => {
		void loadWards();
	});

	$effect(() => {
		const wid = Number(wardId);
		bedId = '';
		if (Number.isFinite(wid) && wid > 0) void loadFreeBeds(wid);
		else beds = [];
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		const visitId = AdmitToIpdDialogState.visitId;
		const branchId = AdmitToIpdDialogState.branchId;
		if (!visitId || !branchId) {
			toastService.addToast(
				'Visit / branch context missing',
				StatusColorEnum.ERROR
			);
			return;
		}
		const wid = Number(wardId);
		const bid = Number(bedId);
		if (!wid || !bid) {
			toastService.addToast(
				'Select ward and bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!censusApi) return;
		isSubmitting = true;
		try {
			const res = await fetch(censusApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'admit',
					visitId,
					wardId: wid,
					bedId: bid,
					branchId,
					reasonNotes: reasonNotes.trim() || null,
					admittingDoctorId: AdmitToIpdDialogState.admittingDoctorId
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Admit failed: ${res.status}`);
			}
			toastService.addToast(
				'Patient admitted to IPD',
				StatusColorEnum.SUCCESS
			);
			confirm(await res.json());
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Admit failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	{#if isLoading}
		<p class="text-sm opacity-70">Loading wards…</p>
	{/if}
	<label class="label-ink text-sm font-medium" for="admit-ward"
		>Ward</label
	>
	<WashSelect
		id="admit-ward"
		placeholder="Select ward"
		className="w-full"
		options={wardOptions}
		bind:value={wardId}
	/>
	<label class="label-ink text-sm font-medium" for="admit-bed"
		>Bed</label
	>
	<WashSelect
		id="admit-bed"
		placeholder="Select free bed"
		className="w-full"
		options={bedOptions}
		bind:value={bedId}
		disabled={!wardId || bedOptions.length === 0}
	/>
	<label class="label-ink text-sm font-medium" for="admit-notes"
		>Reason / notes</label
	>
	<WashInputField
		id="admit-notes"
		bind:value={reasonNotes}
		inputType="text"
		inputPlaceholderText="Optional"
	/>
	<div class="modal-action mt-2 flex justify-end gap-2">
		<WashButton
			type="button"
			className="btn"
			onClick={() => cancel()}
			disabled={isSubmitting}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn btn-primary"
			loading={isSubmitting}
			disabled={isSubmitting || !wardId || !bedId}
		>
			Admit
		</WashButton>
	</div>
</form>
