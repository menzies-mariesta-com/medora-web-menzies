<script lang="ts">
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		cancelReferHistory,
		getReferHistoryPaginated
	} from '$lib/remote/table/information-table/refer-history.remote';
	import MariTable from '$lib/component/library/mari/table/MariTable.svelte';
	import type { MariTableColumn } from '$lib/component/library/mari/table/MariTable.svelte';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LCancelReferReasonDialogContent from '$lib/component/local/private/heka/cpoe/refer/LCancelReferReasonDialogContent.svelte';

	let rows = $state<any[]>([]);
	let totalRowCount = $state(0);
	let isLoading = $state(false);
	let pageSize = $state('10');
	let currentPage = $state(1);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastReferHistoryFetchKey = $state('');
	let cancellingRowId = $state<number | null>(null);
	const toastService = new ToastService();

	const visitId = $derived(VisitState.visitId);

	const columns: MariTableColumn[] = [
		{ id: 'referDate', header: 'Date', field: 'referDate', filterable: false },
		{ id: 'subject', header: 'Subject', field: 'subject', filterable: false },
		{
			id: 'toBranch',
			header: 'To Branch',
			field: 'toBranch.name',
			filterable: false
		},
		{
			id: 'toReferDoctor',
			header: 'To Doctor',
			filterable: false,
			format: (_, row) =>
				`${StringUtil.doctorOptionDisplayName(row.toReferDoctor)}`
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			field: 'isUrgent',
			filterable: false,
			format: (v) => (v === YesNoEnum.YES ? 'Yes' : 'No')
		},
		{
			id: 'referRequestNote',
			header: 'Request Note',
			field: 'referRequestNote',
			filterable: false
		},
		{
			id: 'acceptDate',
			header: 'Accept Date',
			field: 'acceptDate',
			filterable: false
		},
		{
			id: 'referReplyNote',
			header: 'Reply Note',
			field: 'referReplyNote',
			filterable: false
		},
		{
			id: 'cancelBy',
			header: 'Cancel By',
			field: 'cancelBy',
			filterable: false,
			format: (v) => (v ? String(v) : '—')
		},
		{
			id: 'cancelAt',
			header: 'Cancel At',
			field: 'cancelAt',
			filterable: false
		},
		{
			id: 'cancelReason',
			header: 'Cancel Reason',
			field: 'cancelRemark',
			filterable: false
		}
	];

	async function loadData(options?: { force?: boolean }) {
		if (!visitId) {
			rows = [];
			totalRowCount = 0;
			return;
		}

		const requestKey = JSON.stringify({
			visitId: String(visitId),
			page: currentPage,
			pageSize: pageSize,
			filters: tableFilters
		});
		if (!options?.force && requestKey === lastReferHistoryFetchKey) {
			return;
		}
		lastReferHistoryFetchKey = requestKey;

		isLoading = true;
		try {
			const res = await getReferHistoryPaginated({
				page: currentPage,
				pageSize: parseInt(pageSize, 10),
				visitId: visitId ? parseInt(visitId, 10) : undefined,
				filters: tableFilters
			});
			rows = res.data;
			totalRowCount = res.total;
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	async function handleCancelRow(row: any) {
		if (!row?.id) return;
		if (row.acceptDate != null) return; // already accepted
		if (row.cancelAt != null) return; // already cancelled

		const res = await dialogService.open<{
			cancelReason: string;
		}>({
			title: 'Cancel referral',
			component: LCancelReferReasonDialogContent
		});

		if (!res.confirmed) return;
		const cancelReason = res.data?.cancelReason;
		if (!cancelReason) return;

		cancellingRowId = row.id as number;
		try {
			await cancelReferHistory({
				id: row.id as number,
				cancelReason
			});
			toastService.addToast(
				'Referral cancelled.',
				StatusColorEnum.SUCCESS
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Cancel failed',
				StatusColorEnum.ERROR
			);
		} finally {
			cancellingRowId = null;
		}
	}

	$effect(() => {
		// Re-run when page, pageSize, or visitId changes
		currentPage;
		pageSize;
		visitId;
		if (!visitId) {
			rows = [];
			totalRowCount = 0;
			return;
		}
		loadData();
	});
</script>

<div class="flex h-full flex-col p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-bold">Referral History</h2>
	</div>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to view referral history.'}
			className="z-0"
		/>
	{:else}
		<div
			class="flex-1 overflow-hidden rounded-lg border border-base-200 bg-base-100 shadow-sm"
		>
			<MariTable
				{columns}
				{rows}
				{totalRowCount}
				{isLoading}
				bind:pageSize
				bind:currentPage
				bind:columnFilters={tableFilters}
				useRemoteFilters={true}
				enableColumnFilters={true}
				on:refresh={() => loadData({ force: true })}
				on:filtersChange={(event) => {
					// MariTable already updates the UI via bind:columnFilters, but we
					// still handle the remote reload here (debounced).
					const nextFilters = event.detail.filters;
					const nextKey = JSON.stringify(nextFilters);
					const currentKey = JSON.stringify(tableFilters);
					if (nextKey === currentKey) return;

					tableFilters = nextFilters;
					currentPage = 1;

					if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
					filterDebounceTimeout = setTimeout(() => {
						loadData();
					}, 350);
				}}
				showRowActions={true}
				actionsHeader="Actions"
				actionsVariant="none"
			>
				<svelte:fragment slot="rowActions" let:row let:rowIndex>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm d-btn-error"
						disabled={
							cancellingRowId === row.id ||
							row.acceptDate != null ||
							row.cancelAt != null
						}
						onClick={(e) => {
							e.stopPropagation();
							handleCancelRow(row);
						}}
					>
						Cancel
					</DaisyUiButton>
				</svelte:fragment>
			</MariTable>
		</div>
	{/if}
</div>