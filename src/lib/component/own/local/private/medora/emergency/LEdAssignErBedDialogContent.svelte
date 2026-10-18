<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { ErBedRow, ErWardRow } from '$lib/model/type/medora/er/er.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		visitId: string;
		onAssigned?: () => void | Promise<void>;
	};

	let { confirm, cancel, visitId, onAssigned }: Props = $props();

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-ward-master?active=1`
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-bed-master?free=1`
			: ''
	);
	const edApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);

	let wards = $state<ErWardRow[]>([]);
	let freeBeds = $state<ErBedRow[]>([]);
	let wardId = $state('');
	let selectedBedId = $state<number | null>(null);
	let loading = $state(false);
	let submitting = $state(false);

	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code?.trim() ? `${w.name} (${w.code})` : w.name
		}))
	);

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (!res.ok) return;
		wards = (await res.json()) as ErWardRow[];
	}

	async function loadFreeBeds() {
		selectedBedId = null;
		freeBeds = [];
		if (!bedApi || !wardId) return;
		loading = true;
		try {
			const res = await fetch(
				`${bedApi}&wardId=${encodeURIComponent(wardId)}`,
				{ credentials: 'include' }
			);
			if (!res.ok) return;
			freeBeds = (await res.json()) as ErBedRow[];
		} finally {
			loading = false;
		}
	}

	async function submitAssign() {
		if (!edApi || !visitId || selectedBedId == null) {
			toastService.addToast(
				msg.ed_er_bed_pick_required?.() ?? 'Select a bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(edApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'assign_bed',
					visitId,
					erBedId: selectedBedId
				})
			});
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `Assign failed (${res.status})`);
			}
			toastService.addToast(
				msg.ed_er_bed_assigned_toast?.() ?? 'ER bed assigned',
				StatusColorEnum.SUCCESS
			);
			await onAssigned?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Assign failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => {
		void loadWards();
	});

	$effect(() => {
		void wardId;
		void loadFreeBeds();
	});
</script>

<div class="flex flex-col gap-3 px-4 py-3">
	<h2 class="card-title text-primary font-bold">
		{msg.ed_assign_er_bed_title?.() ?? 'Assign ER bed'}
	</h2>
	<label class="form-control" for="ed-assign-ward">
		<span class="label-text">
			{msg.ed_er_ward?.() ?? 'ER ward'}<span
				class="text-error align-top text-sm leading-none"
				aria-hidden="true">*</span
			>
		</span>
		<WashSelect
			id="ed-assign-ward"
			placeholder={msg.ed_er_ward_placeholder?.() ?? 'Select ER ward'}
			options={wardOptions}
			bind:value={wardId}
			disabled={submitting}
		/>
	</label>
	<div class="overflow-auto rounded-box border border-base-300">
		<table
			class="table table-zebra [&_tbody_tr]:hover:bg-primary/40 table-sm"
		>
			<thead>
				<tr>
					<th>{msg.room?.() ?? 'Room'}</th>
					<th>{msg.bed?.() ?? 'Bed'}</th>
					<th>{msg.status?.() ?? 'Status'}</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="3" class="text-center opacity-70">
							{msg.loading?.() ?? 'Loading…'}
						</td>
					</tr>
				{:else if !wardId}
					<tr>
						<td colspan="3" class="text-center opacity-70">
							{msg.ed_er_ward_first?.() ?? 'Select a ward first'}
						</td>
					</tr>
				{:else if freeBeds.length === 0}
					<tr>
						<td colspan="3" class="text-center opacity-70">
							{msg.ed_no_free_er_beds?.() ?? 'No free ER beds'}
						</td>
					</tr>
				{:else}
					{#each freeBeds as bed (bed.id)}
						<tr
							class="cursor-pointer"
							class:bg-primary={selectedBedId === bed.id}
							class:text-primary-content={selectedBedId === bed.id}
							onclick={() => (selectedBedId = bed.id)}
						>
							<td>{bed.roomName ?? bed.roomCode ?? '—'}</td>
							<td>{bed.code?.trim() ? `${bed.name} (${bed.code})` : bed.name}</td>
							<td>{msg.bed_status_free?.() ?? 'Free'}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<div class="flex justify-end gap-2">
		<WashButton
			className="btn-ghost cursor-pointer"
			disabled={submitting}
			onClick={() => cancel()}
		>
			{msg.cancel?.() ?? 'Cancel'}
		</WashButton>
		<WashButton
			className={submitting
				? 'btn-primary cursor-not-allowed'
				: 'btn-primary cursor-pointer'}
			loading={submitting}
			disabled={submitting || selectedBedId == null}
			aria-busy={submitting}
			onClick={() => submitAssign()}
		>
			{msg.assign?.() ?? 'Assign'}
		</WashButton>
	</div>
</div>
