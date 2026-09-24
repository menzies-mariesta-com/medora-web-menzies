<script lang="ts">
	import { page } from '$app/state';
	import BedFormModal from '$lib/component/own/local/private/medora/administration/bed/BedFormModal.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		IpdBedStatusEnum,
		StatusEnum
	} from '$lib/model/enum/db-link';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { BedRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { BedModalState } from '$lib/state/bed-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/bed-master`
			: ''
	);

	let rows = $state<BedRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const bedStatusLabels: Record<number, string> = {
		[IpdBedStatusEnum.FREE]: 'Free',
		[IpdBedStatusEnum.OCCUPIED]: 'Occupied',
		[IpdBedStatusEnum.BLOCKED]: 'Blocked',
		[IpdBedStatusEnum.CLEANING]: 'Cleaning'
	};

	const bedColumns: MenziesTableColumn<BedRow>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
		{
			id: 'wardName',
			header: 'Ward',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			format: (_value, row) => row.wardName ?? row.wardCode ?? '—'
		},
		{
			id: 'roomName',
			header: 'Room',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			format: (_value, row) => row.roomName ?? row.roomCode ?? '—'
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-40 min-w-[9rem]',
			filterable: true,
			field: 'name'
		},
		{
			id: 'code',
			header: m.code(),
			widthClass: 'w-28 min-w-[6rem]',
			filterable: true,
			field: 'code'
		},
		{
			id: 'basePrice',
			header: 'Base',
			widthClass: 'w-24 min-w-[5rem]',
			filterable: false,
			format: (_v, row) => row.basePrice ?? '0'
		},
		{
			id: 'dailyTariff',
			header: 'Daily tariff',
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			format: (_v, row) => row.dailyTariff ?? '—'
		},
		{
			id: 'bedStatus',
			header: 'Bed Status',
			widthClass: 'w-36 min-w-[8rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Free', value: String(IpdBedStatusEnum.FREE) },
				{
					label: 'Occupied',
					value: String(IpdBedStatusEnum.OCCUPIED)
				},
				{ label: 'Blocked', value: String(IpdBedStatusEnum.BLOCKED) },
				{
					label: 'Cleaning',
					value: String(IpdBedStatusEnum.CLEANING)
				}
			],
			format: (_value, row) =>
				bedStatusLabels[row.bedStatus] ?? String(row.bedStatus)
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchRows() {
		if (!bedApi) return;
		isLoading = true;
		try {
			const query = new SvelteURLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10)
			});
			const name = tableFilters.name?.trim();
			const code = tableFilters.code?.trim();
			const bedStatus = Number(tableFilters.bedStatus);
			const statusId = Number(tableFilters.status);
			if (name) query.set('name', name);
			if (code) query.set('code', code);
			if (Number.isFinite(bedStatus) && bedStatus > 0) {
				query.set('bedStatus', String(bedStatus));
			}
			if (Number.isFinite(statusId) && statusId > 0) {
				query.set('statusId', String(statusId));
			}

			const response = await fetch(`${bedApi}?${query.toString()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Load failed: ${response.status}`);
			}
			const result = (await response.json()) as {
				data: BedRow[];
				total: number;
				totalPages: number;
			};
			rows = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to load beds',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	function goToPage(nextPage: number) {
		currentPage = Math.max(1, Math.min(nextPage, totalPages));
		fetchRows();
	}

	lifeCycleUtil.onMount(fetchRows);

	async function openCreate() {
		BedModalState.mode = 'create';
		BedModalState.editBed = null;
		const result = await dialogService.open({
			title: 'New Bed',
			component: BedFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: BedRow) {
		BedModalState.mode = 'edit';
		BedModalState.editBed = row;
		const result = await dialogService.open({
			title: 'Edit Bed',
			component: BedFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: BedRow) {
		const result = await dialogService.open({
			title: 'Delete Bed',
			message: `Delete "${row.name || row.code || `Bed ${row.id}`}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed || !bedApi) return;

		try {
			const response = await fetch(
				`${bedApi}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Delete failed: ${response.status}`);
			}
			toastService.addToast('Bed deleted', StatusColorEnum.SUCCESS);
			fetchRows();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to delete bed',
				StatusColorEnum.ERROR
			);
		}
	}

	async function markAvailable(row: BedRow) {
		if (!bedApi) return;
		try {
			const response = await fetch(bedApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'markAvailable',
					id: row.id
				})
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Update failed: ${response.status}`);
			}
			toastService.addToast(
				'Bed marked available',
				StatusColorEnum.SUCCESS
			);
			fetchRows();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to mark bed available',
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<div class="space-y-4">
	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			title="Beds"
			{rows}
			columns={bedColumns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage="No beds found"
			showRowActions={true}
			actionsHeader={m.actions()}
			actionsVariant="none"
			enableColumnFilters={true}
			showAddButton={true}
			addLabel="New Bed"
			onAdd={openCreate}
			on:refresh={() => fetchRows()}
			on:pageSizeChange={() => {
				currentPage = 1;
				fetchRows();
			}}
			on:pageChange={() => fetchRows()}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout)
					clearTimeout(filterDebounceTimeout);
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(fetchRows, 350);
			}}
		>
			{#snippet rowActions(row)}
				<div class="flex items-center gap-1">
					{#if row.bedStatus === IpdBedStatusEnum.CLEANING || row.bedStatus === IpdBedStatusEnum.BLOCKED}
						<WashButton
							className="btn-ghost btn-xs"
							onClick={() => markAvailable(row)}
						>
							Available
						</WashButton>
					{/if}
					<MenziesTableEditDeleteActions
						onEdit={() => openEdit(row)}
						onDelete={() => handleDelete(row)}
					/>
				</div>
			{/snippet}
		</MenziesTable>
	</div>
	{#if totalPages > 1}
		<div class="flex justify-center gap-2">
			<WashButton
				className="btn-sm"
				disabled={currentPage <= 1}
				onClick={() => goToPage(currentPage - 1)}
			>
				{m.previous()}
			</WashButton>
			<span class="flex items-center px-2">
				{m.page()}
				{currentPage}
				{m.of()}
				{totalPages}
			</span>
			<WashButton
				className="btn-sm"
				disabled={currentPage >= totalPages}
				onClick={() => goToPage(currentPage + 1)}
			>
				{m.next()}
			</WashButton>
		</div>
	{/if}
</div>
