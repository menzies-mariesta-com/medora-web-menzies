<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { ErBedStatusBoardRow } from '$lib/model/type/medora/er/er.type';
	import { IpdBedStatusEnum } from '$lib/model/enum/db-link';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import {
		erBedStatusBadgeClass,
		erBedStatusLabel
	} from '$lib/tool/medora/er-bed-status-label.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		visitId: string;
		mode?: 'assign' | 'transfer';
		currentErBedId?: number | null;
		onDone?: () => void | Promise<void>;
	};

	let {
		confirm,
		cancel,
		visitId,
		mode = 'assign',
		currentErBedId = null,
		onDone
	}: Props = $props();

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const bedStatusApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emergency/bed-status`
			: ''
	);
	const edApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);

	let rows = $state<ErBedStatusBoardRow[]>([]);
	let loading = $state(false);
	let submittingBedId = $state<number | null>(null);

	async function loadBeds() {
		if (!bedStatusApi) return;
		loading = true;
		try {
			const res = await fetch(bedStatusApi, { credentials: 'include' });
			if (!res.ok) return;
			rows = (await res.json()) as ErBedStatusBoardRow[];
		} finally {
			loading = false;
		}
	}

	async function assignToBed(erBedId: number) {
		if (!edApi || submittingBedId != null) return;
		submittingBedId = erBedId;
		try {
			const action =
				mode === 'transfer' ? 'transfer_bed' : 'assign_bed';
			const res = await fetch(edApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action, visitId, erBedId })
			});
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `Failed (${res.status})`);
			}
			toastService.addToast(
				msg.ed_er_bed_assigned_toast?.() ?? 'ED bed assigned',
				StatusColorEnum.SUCCESS
			);
			await onDone?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Assign failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submittingBedId = null;
		}
	}

	lifeCycle.onMount(() => {
		void loadBeds();
	});
</script>

<div class="flex max-h-[min(70vh,32rem)] flex-col gap-3">
	<p class="text-sm opacity-80">
		{mode === 'transfer'
			? (msg.ed_reg_bed_transfer_hint?.() ??
				'Pick a vacant bed to transfer this patient.')
			: (msg.ed_reg_bed_assign_hint?.() ??
				'Vacant beds can be assigned to this visit.')}
	</p>
	{#if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto rounded-lg border border-base-300">
			<table class="table table-zebra table-sm [&_tbody_tr]:hover:bg-primary/40">
				<thead class="sticky top-0 z-10 bg-base-200">
					<tr>
						<th>{msg.ed_reg_bed_col_ward?.() ?? 'Ward'}</th>
						<th>{msg.ed_reg_bed_col_room?.() ?? 'Room'}</th>
						<th>{msg.ed_reg_bed_col_bed?.() ?? 'Bed'}</th>
						<th>{msg.status?.() ?? 'Status'}</th>
						<th>{msg.ed_reg_bed_col_patient?.() ?? 'Patient'}</th>
						<th>{msg.ed_admission_actions?.() ?? 'Actions'}</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.erBedId)}
						<tr>
							<td>{row.wardName ?? '—'}</td>
							<td>{row.roomName ?? '—'}</td>
							<td>{row.bedCode?.trim() || row.bedName || '—'}</td>
							<td>
								<span
									class="badge badge-sm {erBedStatusBadgeClass(
										row.bedStatus
									)}"
								>
									{erBedStatusLabel(row.bedStatus, {
										vacant:
											msg.ed_bed_status_vacant?.() ??
											'Vacant',
										occupied:
											msg.ed_bed_status_occupied?.() ??
											'Occupied'
									})}
								</span>
							</td>
							<td>{row.patientName ?? '—'}</td>
							<td>
								{#if row.bedStatus === IpdBedStatusEnum.FREE && row.erBedId !== currentErBedId}
									<WashButton
										type="button"
										className="btn btn-primary btn-xs cursor-pointer"
										loading={submittingBedId === row.erBedId}
										disabled={submittingBedId != null}
										aria-busy={submittingBedId === row.erBedId}
										onClick={() => void assignToBed(row.erBedId)}
									>
										{mode === 'transfer'
											? (msg.ed_reg_bed_transfer_btn?.() ??
												'Transfer')
											: (msg.ed_reg_bed_assign_btn?.() ??
												'Assign')}
									</WashButton>
								{:else}
									<span class="text-xs opacity-50">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<div class="flex justify-end gap-2">
		<WashButton
			type="button"
			className="btn btn-ghost cursor-pointer"
			onClick={() => cancel()}
		>
			{m.cancel?.() ?? 'Cancel'}
		</WashButton>
	</div>
</div>
