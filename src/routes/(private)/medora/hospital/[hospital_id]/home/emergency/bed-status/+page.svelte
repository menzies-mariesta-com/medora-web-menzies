<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { IpdBedStatusEnum } from '$lib/model/enum/db-link';
	import { erBedStatusLabel } from '$lib/tool/medora/er-bed-status-label.util';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { ErBedStatusBoardRow } from '$lib/model/type/medora/er/er.type';
	import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
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
			? `/api/medora/hospital/${hospitalId}/home/emergency/bed-status`
			: ''
	);
	const msg = m as Record<string, (inputs?: object) => string>;
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1&scope=er`
			: ''
	);

	let rows = $state<ErBedStatusBoardRow[]>([]);
	let wards = $state<WardRow[]>([]);
	let wardFilter = $state('');
	let statusFilter = $state('');
	let isLoading = $state(false);

	const wardOptions = $derived(
		wards.map((w) => ({ value: String(w.id), label: w.name }))
	);
	const statusOptions = [
		{
			value: String(IpdBedStatusEnum.FREE),
			label: msg.ed_bed_status_vacant?.() ?? 'Vacant'
		},
		{
			value: String(IpdBedStatusEnum.OCCUPIED),
			label: msg.ed_bed_status_occupied?.() ?? 'Occupied'
		}
	];

	function statusLabel(s: number) {
		return erBedStatusLabel(s, {
			vacant: msg.ed_bed_status_vacant?.() ?? 'Vacant',
			occupied: msg.ed_bed_status_occupied?.() ?? 'Occupied'
		});
	}

	const columns: MenziesTableColumn<ErBedStatusBoardRow>[] = [
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
			id: 'bedName',
			header: 'Bed',
			widthClass: 'w-28',
			format: (_v, row) =>
				row.bedCode?.trim()
					? `${row.bedName ?? ''} (${row.bedCode})`
					: (row.bedName ?? '')
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
			format: (_v, row) => {
				const name = row.patientName?.trim() || '';
				if (row.dischargedInBed) {
					const tag =
						msg.ed_bed_status_discharged_in_bed?.() ??
						'Discharged, in bed';
					return name ? `${name} (${tag})` : tag;
				}
				return name;
			}
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
			rows = (await res.json()) as ErBedStatusBoardRow[];
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

	lifeCycleUtil.onMount(() => {
		loadWards();
		load();
	});
</script>

<div class="space-y-4">
	<h1 class="text-primary text-lg font-bold">{msg.ed_bed_status_title()}</h1>
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
			title={msg.ed_bed_status_title()}
			{rows}
			{columns}
			{isLoading}
			pageSize={`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`}
			currentPage={1}
			totalRowCount={rows.length}
			showRefreshButton={true}
			emptyMessage="No beds"
			showRowActions={false}
			enableColumnFilters={false}
			on:refresh={() => load()}
		/>
	</div>
</div>
