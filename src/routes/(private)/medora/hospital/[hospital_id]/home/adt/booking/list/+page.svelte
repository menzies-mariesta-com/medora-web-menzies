<script lang="ts">
	import { page } from '$app/state';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { IpdBedBookingStatusTaggingEnum } from '$lib/model/enum/db-link';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { AdtBookingRow } from '$lib/model/type/medora/adt/adt.type';
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
			? `/api/medora/hospital/${hospitalId}/home/adt/booking`
			: ''
	);

	let rows = $state<AdtBookingRow[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function bookingStatusLabel(id: number) {
		if (id === IpdBedBookingStatusTaggingEnum.BOOKED) return 'Booked';
		if (id === IpdBedBookingStatusTaggingEnum.CANCELLED)
			return 'Cancelled';
		if (id === IpdBedBookingStatusTaggingEnum.CONVERTED)
			return 'Converted';
		return String(id);
	}

	const columns: MenziesTableColumn<AdtBookingRow>[] = [
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true,
			format: (_v, row) =>
				row.patientName ??
				(row.patientId ? '(registered)' : '—')
		},
		{
			id: 'phone',
			header: 'Phone',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'phone',
			filterable: true
		},
		{
			id: 'preferredWardName',
			header: 'Ward',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'preferredWardName',
			filterable: false
		},
		{
			id: 'expectedAdmitAt',
			header: 'Expected',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			format: (_v, row) =>
				row.expectedAdmitAt
					? new Date(row.expectedAdmitAt).toLocaleString()
					: '—'
		},
		{
			id: 'statusTaggingId',
			header: 'Status',
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			format: (_v, row) => bookingStatusLabel(row.statusTaggingId)
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
			const searchBits = [tableFilters.patientName, tableFilters.phone]
				.map((s) => s?.trim())
				.filter(Boolean);
			if (searchBits.length)
				qs.set('search', searchBits.join(' '));
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) throw new Error(await res.text());
			const result = (await res.json()) as PaginatedResult<AdtBookingRow>;
			rows = result.data ?? [];
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

	async function handleCancel(row: AdtBookingRow) {
		if (!api) return;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'cancel', id: row.id })
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast('Booking cancelled', StatusColorEnum.SUCCESS);
			fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Cancel failed',
				StatusColorEnum.ERROR
			);
		}
	}

	function goToNew() {
		if (!hospitalId) return;
		routerUtil.replaceRoute(
			medoraHospitalPageUrl(
				hospitalId,
				WebRoutesEnum.MEDORA_HOME_ADT_BOOKING_NEW
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
		title="Bookings"
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		emptyMessage="No bookings"
		showRowActions={true}
		actionsHeader="Actions"
		actionsVariant="none"
		enableColumnFilters={true}
		showAddButton={true}
		addLabel="New Booking"
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
			{#if row.statusTaggingId === IpdBedBookingStatusTaggingEnum.BOOKED}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText="Cancel"
						color="error"
						onClick={() => handleCancel(row)}
					>
						{#snippet icon()}
							<LucideBan className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/if}
		{/snippet}
	</MenziesTable>
</div>
