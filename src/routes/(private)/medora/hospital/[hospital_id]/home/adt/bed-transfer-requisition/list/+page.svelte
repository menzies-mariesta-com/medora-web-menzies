<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { IpdBedTransferReqStatusTaggingEnum } from '$lib/model/enum/db-link';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { AdtTransferReqRow } from '$lib/model/type/medora/adt/adt.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/bed-transfer-requisition`
			: ''
	);

	let rows = $state<AdtTransferReqRow[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function statusLabel(id: number) {
		const map: Record<number, string> = {
			[IpdBedTransferReqStatusTaggingEnum.DRAFT]: 'Draft',
			[IpdBedTransferReqStatusTaggingEnum.PENDING]: 'Pending',
			[IpdBedTransferReqStatusTaggingEnum.APPROVED]: 'Approved',
			[IpdBedTransferReqStatusTaggingEnum.COMPLETED]: 'Completed',
			[IpdBedTransferReqStatusTaggingEnum.CANCELLED]: 'Cancelled'
		};
		return map[id] ?? String(id);
	}

	const columns: MenziesTableColumn<AdtTransferReqRow>[] = [
		{
			id: 'admissionNo',
			header: 'Admission',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'admissionNo',
			filterable: true
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			field: 'patientName',
			filterable: true
		},
		{
			id: 'fromBedName',
			header: 'From',
			widthClass: 'w-28 min-w-[6rem]',
			field: 'fromBedName',
			filterable: false
		},
		{
			id: 'toBedName',
			header: 'To',
			widthClass: 'w-28 min-w-[6rem]',
			field: 'toBedName',
			filterable: false
		},
		{
			id: 'statusTaggingId',
			header: 'Status',
			widthClass: 'w-32 min-w-[7rem]',
			filterable: true,
			format: (_v, row) => statusLabel(row.statusTaggingId)
		}
	];

	async function fetchRows() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10)
			});
			const statusFilter = tableFilters.statusTaggingId?.trim();
			if (statusFilter) {
				const match = (
					Object.entries({
						Draft: IpdBedTransferReqStatusTaggingEnum.DRAFT,
						Pending: IpdBedTransferReqStatusTaggingEnum.PENDING,
						Approved: IpdBedTransferReqStatusTaggingEnum.APPROVED,
						Completed: IpdBedTransferReqStatusTaggingEnum.COMPLETED,
						Cancelled: IpdBedTransferReqStatusTaggingEnum.CANCELLED
					}) as [string, number][]
				).find(([label]) =>
					label.toLowerCase().startsWith(statusFilter.toLowerCase())
				);
				if (match) qs.set('statusTaggingId', String(match[1]));
			}
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) throw new Error(await res.text());
			const result =
				(await res.json()) as PaginatedResult<AdtTransferReqRow>;
			let data = result.data ?? [];
			const adm = tableFilters.admissionNo?.trim().toLowerCase();
			const pat = tableFilters.patientName?.trim().toLowerCase();
			if (adm)
				data = data.filter((r) =>
					(r.admissionNo ?? '').toLowerCase().includes(adm)
				);
			if (pat)
				data = data.filter((r) =>
					(r.patientName ?? '').toLowerCase().includes(pat)
				);
			rows = data;
			total = result.total ?? 0;
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function postAction(action: string, id: number) {
		if (!api) return;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action, id })
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				action === 'complete' ? 'Transfer completed' : 'Cancelled',
				StatusColorEnum.SUCCESS
			);
			fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Action failed',
				StatusColorEnum.ERROR
			);
		}
	}

	function goToNew() {
		if (!hospitalId) return;
		routerUtil.replaceRoute(
			medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_ADT_BED_TRANSFER_REQUISITION_NEW
			)
		);
	}

	lifeCycleUtil.onMount(() => {
		fetchRows();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<div class={TableEnum.HEIGHT}>
	<MenziesTable
		title="Transfer Requisitions"
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		emptyMessage="No requisitions"
		showRowActions={true}
		actionsHeader="Actions"
		actionsVariant="none"
		enableColumnFilters={true}
		showAddButton={true}
		addLabel="New Requisition"
		onAdd={goToNew}
		on:refresh={() => fetchRows()}
		on:pageSizeChange={() => {
			currentPage = 1;
			fetchRows();
		}}
		on:pageChange={() => fetchRows()}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				fetchRows();
			}, 350);
		}}
	>
		{#snippet rowActions(row)}
			{#if row.statusTaggingId === IpdBedTransferReqStatusTaggingEnum.PENDING || row.statusTaggingId === IpdBedTransferReqStatusTaggingEnum.APPROVED || row.statusTaggingId === IpdBedTransferReqStatusTaggingEnum.DRAFT}
				{#if row.toBedId != null}
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => postAction('complete', row.id)}
					>
						Complete
					</WashButton>
				{/if}
				<WashButton
					className="btn-ghost btn-xs"
					onClick={() => postAction('cancel', row.id)}
				>
					Cancel
				</WashButton>
			{/if}
		{/snippet}
	</MenziesTable>
</div>
