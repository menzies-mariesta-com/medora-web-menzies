<script lang="ts">
	import { page } from '$app/state';
	import { parseUuid } from '$lib/util/id.util';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { MedicationScheduleRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(parseUuid(page.url.searchParams.get('visitId') ?? '') ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/emar`
			: ''
	);

	let schedules = $state<MedicationScheduleRow[]>([]);
	let scanPatient = $state('');
	let scanProduct = $state('');
	let scanNurse = $state('');
	let selectedScheduleId = $state('');
	let selectedLineId = $state('');
	let isSubmitting = $state(false);

	async function loadSchedules() {
		if (!apiBase) return;
		const from = new Date(Date.now() - 86400000).toISOString();
		const to = new Date(Date.now() + 86400000 * 2).toISOString();
		const qs = new URLSearchParams({
			mode: 'schedule.list',
			from,
			to
		});
		if (visitId) qs.set('visitId', visitId);
		const res = await fetch(`${apiBase}?${qs}`);
		schedules = (await res.json()) as MedicationScheduleRow[];
	}

	async function administer() {
		if (!visitId || !selectedLineId) return;
		isSubmitting = true;
		try {
			const res = await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'administration.record',
					visitId,
					scheduleId: selectedScheduleId
						? Number(selectedScheduleId)
						: null,
					lineId: Number(selectedLineId),
					status: 'given',
					scannedPatientToken: scanPatient.trim(),
					scannedProductBarcode: scanProduct.trim(),
					scannedNurseCode: scanNurse.trim()
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastSuccess(
				toastService,
				msg.clinical_emar_title(),
				msg.clinical_administer_med()
			);
			await loadSchedules();
		} finally {
			isSubmitting = false;
		}
	}

	$effect(() => {
		if (apiBase) void loadSchedules();
	});
</script>

<div class="flex flex-col gap-4 p-2">
	<h1 class="text-primary text-xl font-bold">{msg.clinical_emar_title()}</h1>
	{#if !visitId}
		<p class="text-sm">{msg.ld_visit_required()}</p>
	{:else}
		<WashCard>
			<WashCardBody className="gap-3">
				<p class="text-sm font-medium">BCMA scans</p>
				<label class="flex flex-col gap-1 text-sm" for="scan-patient">
					{msg.clinical_scan_patient()}
					<WashInputField
						id="scan-patient"
						className="input-lg"
						bind:value={scanPatient}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm" for="scan-product">
					{msg.clinical_scan_product()}
					<WashInputField
						id="scan-product"
						className="input-lg"
						bind:value={scanProduct}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm" for="scan-nurse">
					{msg.clinical_scan_nurse()}
					<WashInputField
						id="scan-nurse"
						className="input-lg"
						bind:value={scanNurse}
					/>
				</label>
				<WashSelect
					className="select-sm w-full"
					placeholder="Scheduled dose"
					options={schedules.map((s) => ({
						value: String(s.id),
						label: `${s.itemName ?? 'Med'} · ${s.scheduledAt}`
					}))}
					value={selectedScheduleId}
					onChange={(v) => {
						selectedScheduleId = v ?? '';
						const row = schedules.find((s) => String(s.id) === v);
						selectedLineId = row ? String(row.lineId) : '';
					}}
				/>
				<WashButton
					type="button"
					className="btn-primary cursor-pointer"
					loading={isSubmitting}
					disabled={isSubmitting ||
						!scanPatient.trim() ||
						!scanProduct.trim() ||
						!scanNurse.trim()}
					onclick={() => void administer()}
				>
					{msg.clinical_administer_med()}
				</WashButton>
			</WashCardBody>
		</WashCard>
		<div class="overflow-auto">
			<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
				<thead>
					<tr>
						<th>Due</th>
						<th>Medication</th>
						<th>Dose</th>
					</tr>
				</thead>
				<tbody>
					{#each schedules as row (row.id)}
						<tr class="cursor-pointer">
							<td>{row.scheduledAt}</td>
							<td>{row.itemName}</td>
							<td>{row.doseLabel}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
