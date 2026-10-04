<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { IpdBedStatusEnum } from '$lib/model/enum/db-link';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { AdtBedStatusRow } from '$lib/model/type/medora/adt/adt.type';
	import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/bed-status`
			: ''
	);
	const admissionApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`
			: ''
	);

	let rows = $state<AdtBedStatusRow[]>([]);
	let wards = $state<WardRow[]>([]);
	let wardFilter = $state('');
	let statusFilter = $state('');
	let isLoading = $state(false);

	const wardOptions = $derived(
		wards.map((w) => ({ value: String(w.id), label: w.name }))
	);
	const statusOptions = [
		{ value: String(IpdBedStatusEnum.FREE), label: 'Free' },
		{ value: String(IpdBedStatusEnum.OCCUPIED), label: 'Occupied' },
		{ value: String(IpdBedStatusEnum.BLOCKED), label: 'Blocked' },
		{ value: String(IpdBedStatusEnum.CLEANING), label: 'Cleaning' }
	];

	function statusLabel(s: number) {
		return (
			statusOptions.find((o) => o.value === String(s))?.label ??
			String(s)
		);
	}

	const columns: MenziesTableColumn<AdtBedStatusRow>[] = [
		{
			id: 'wardName',
			header: 'Ward',
			widthClass: 'w-36',
			field: 'wardName'
		},
		{
			id: 'roomName',
			header: 'Room',
			widthClass: 'w-32',
			field: 'roomName'
		},
		{
			id: 'name',
			header: 'Bed',
			widthClass: 'w-28',
			field: 'name'
		},
		{
			id: 'bedStatus',
			header: 'Status',
			widthClass: 'w-28',
			format: (_v, row) => statusLabel(row.bedStatus)
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-40',
			field: 'patientName'
		}
	];

	async function load() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams();
			if (wardFilter) qs.set('wardId', wardFilter);
			if (statusFilter) qs.set('bedStatus', statusFilter);
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			rows = (await res.json()) as AdtBedStatusRow[];
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (res.ok) wards = (await res.json()) as WardRow[];
	}

	async function handleDischarge(row: AdtBedStatusRow) {
		if (!row.admissionId || !admissionApi) return;
		const result = await dialogService.open({
			title: 'Discharge patient',
			message: `Discharge ${row.patientName ?? 'patient'} from bed ${row.name}?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(admissionApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'discharge',
					admissionId: row.admissionId
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast('Discharged', StatusColorEnum.SUCCESS);
			load();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Discharge failed',
				StatusColorEnum.ERROR
			);
		}
	}

	lifeCycleUtil.onMount(() => {
		loadWards();
		load();
	});
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end gap-3">
		<div class="w-56">
			<label class="label-ink mb-1 block text-sm" for="adt-bed-ward"
				>Ward</label
			>
			<WashSelect
				id="adt-bed-ward"
				placeholder="All wards"
				options={wardOptions}
				bind:value={wardFilter}
				onChange={() => load()}
			/>
		</div>
		<div class="w-48">
			<label class="label-ink mb-1 block text-sm" for="adt-bed-status"
				>Status</label
			>
			<WashSelect
				id="adt-bed-status"
				placeholder="All statuses"
				options={statusOptions}
				bind:value={statusFilter}
				onChange={() => load()}
			/>
		</div>
		<WashButton className="btn-primary" onClick={() => load()}
			>Refresh</WashButton
		>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			title="Bed Status"
			{rows}
			{columns}
			{isLoading}
			pageSize={`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`}
			currentPage={1}
			totalRowCount={rows.length}
			showRefreshButton={true}
			emptyMessage="No beds"
			showRowActions={true}
			actionsHeader="Actions"
			actionsVariant="none"
			enableColumnFilters={false}
			on:refresh={() => load()}
		>
			{#snippet rowActions(row)}
				{#if row.admissionId && row.bedStatus === IpdBedStatusEnum.OCCUPIED}
					<MenziesTableRowActionGroup>
						<MenziesTableIconAction
							tooltipText="Discharge"
							color="warning"
							onClick={() => handleDischarge(row)}
						>
							{#snippet icon()}
								<LucideLogOut className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					</MenziesTableRowActionGroup>
				{/if}
			{/snippet}
		</MenziesTable>
	</div>
</div>
