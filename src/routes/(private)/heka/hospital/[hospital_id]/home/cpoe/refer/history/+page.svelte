<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		acceptReferHistory,
		cancelReferHistory,
		getReferHistoryPaginated,
		rejectReferHistory,
		type ReferHistoryWithRelations
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

	let rows = $state<ReferHistoryWithRelations[]>([]);
	let totalRowCount = $state(0);
	let isLoading = $state(false);
	let pageSize = $state('25');
	let currentPage = $state(1);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastReferHistoryFetchKey = $state('');
	let cancellingRowId = $state<number | null>(null);
	let acceptingRowId = $state<number | null>(null);
	const toastService = new ToastService();

	const visitId = $derived(VisitState.visitId);
	const currentStaffId = $derived(
		page.data.staff?.id != null ? String(page.data.staff.id) : null
	);

	function isPendingReferRow(row: {
		acceptDate: unknown;
		acceptAt?: unknown;
		cancelAt: unknown;
	}) {
		const accepted =
			row.acceptDate != null ||
			(row.acceptAt != null && String(row.acceptAt).trim() !== '');
		return !accepted && row.cancelAt == null;
	}

	function isRecipientDoctor(row: { toReferDoctorId?: string | null }) {
		if (!currentStaffId || !row.toReferDoctorId) return false;
		return String(row.toReferDoctorId) === currentStaffId;
	}

	function formatDateTime(iso: unknown): string {
		if (iso == null || String(iso).trim() === '') return '—';
		try {
			return new Intl.DateTimeFormat(undefined, {
				dateStyle: 'short',
				timeStyle: 'short'
			}).format(new Date(String(iso)));
		} catch {
			return String(iso);
		}
	}

	/** Prefer `accept_at` (timestamptz); fall back to legacy `accept_date`. */
	function formatAcceptedAt(
		acceptAt: unknown,
		acceptDate: unknown
	): string {
		if (acceptAt != null && String(acceptAt).trim() !== '') {
			return formatDateTime(acceptAt);
		}
		if (acceptDate != null && String(acceptDate).trim() !== '') {
			return String(acceptDate);
		}
		return '—';
	}

	const rowLegends = [
		{ id: 'active', label: 'Active', colorClass: 'bg-neutral/5' },
		{ id: 'urgent', label: 'Urgent', colorClass: 'bg-warning/25' },
		{ id: 'canceled', label: 'Canceled', colorClass: 'bg-error/25' }
	];

	const columns: MariTableColumn[] = [
		{
			id: 'referDate',
			header: 'Refer date',
			field: 'referDate',
			filterable: false,
			widthClass: 'min-w-[7rem]'
		},
		{
			id: 'subject',
			header: 'Subject',
			field: 'subject',
			filterable: false,
			widthClass: 'min-w-[8rem]'
		},
		{
			id: 'fromBranch',
			header: 'From branch',
			field: 'fromBranch.name',
			filterable: false,
			widthClass: 'min-w-[8rem]'
		},
		{
			id: 'fromReferDoctor',
			header: 'From doctor',
			filterable: false,
			widthClass: 'min-w-[10rem]',
			format: (_, row) =>
				`${StringUtil.doctorOptionDisplayName(row.fromReferDoctor)}`
		},
		{
			id: 'toBranch',
			header: 'To branch',
			field: 'toBranch.name',
			filterable: false,
			widthClass: 'min-w-[8rem]'
		},
		{
			id: 'toReferDoctor',
			header: 'To doctor',
			filterable: false,
			widthClass: 'min-w-[10rem]',
			format: (_, row) =>
				`${StringUtil.doctorOptionDisplayName(row.toReferDoctor)}`
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			field: 'isUrgent',
			filterable: false,
			widthClass: 'min-w-[6rem]',
			format: (v) => (v === YesNoEnum.YES ? 'Yes' : 'No')
		},
		{
			id: 'referRequestNote',
			header: 'Request note',
			field: 'referRequestNote',
			filterable: false,
			widthClass: 'min-w-[10rem]'
		},
		{
			id: 'acceptAt',
			header: 'Accepted At',
			field: 'acceptAt',
			filterable: false,
			widthClass: 'min-w-[11rem]',
			format: (_, row) =>
				formatAcceptedAt(row.acceptAt, row.acceptDate)
		},
		{
			id: 'referReplyNote',
			header: 'Reply note',
			field: 'referReplyNote',
			filterable: false,
			widthClass: 'min-w-[8rem]'
		},
		{
			id: 'createdAt',
			header: 'Created At',
			field: 'createdAt',
			filterable: false,
			widthClass: 'min-w-[11rem]',
			format: (v) => formatDateTime(v)
		},
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

	async function handleCancelRow(row: ReferHistoryWithRelations) {
		if (!row?.id) return;
		if (!isPendingReferRow(row)) return;

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

	async function handleRejectRow(row: ReferHistoryWithRelations) {
		if (!row?.id) return;
		if (!isPendingReferRow(row)) return;

		const res = await dialogService.open<{
			cancelReason: string;
		}>({
			title: 'Reject referral',
			component: LCancelReferReasonDialogContent
		});

		if (!res.confirmed) return;
		const cancelReason = res.data?.cancelReason;
		if (!cancelReason) return;

		cancellingRowId = row.id as number;
		try {
			await rejectReferHistory({
				id: row.id as number,
				rejectReason: cancelReason
			});
			toastService.addToast(
				'Referral rejected.',
				StatusColorEnum.SUCCESS
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Reject failed',
				StatusColorEnum.ERROR
			);
		} finally {
			cancellingRowId = null;
		}
	}

	async function handleAcceptRow(row: ReferHistoryWithRelations) {
		if (!row?.id) return;
		if (!isPendingReferRow(row)) return;

		acceptingRowId = row.id as number;
		try {
			await acceptReferHistory({
				id: row.id as number
			});
			toastService.addToast(
				'Referral accepted.',
				StatusColorEnum.SUCCESS
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Accept failed',
				StatusColorEnum.ERROR
			);
		} finally {
			acceptingRowId = null;
		}
	}

	$effect(() => {
		// Re-run when page, pageSize, or visitId changes
		void [currentPage, pageSize, visitId];
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
			message='Choose a visit using the "Choose Visit" button above to view referral history.'
			className="z-0"
		/>
	{:else}
		<div
			class="flex-1 overflow-x-auto overflow-y-hidden rounded-lg border border-base-200 bg-base-100 shadow-sm"
		>
			<MariTable
				{columns}
				{rows}
				{totalRowCount}
				{isLoading}
				legendItems={rowLegends}
				rowClassGetter={(row) => {
					if (row.cancelAt != null) return '!bg-error/15';
					if (row.isUrgent === YesNoEnum.YES) return '!bg-warning/15';
					return '!bg-neutral/0';
				}}
				rowTooltipGetter={(row) => StringUtil.tableToolTip(row)}
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
				<svelte:fragment slot="rowActions" let:row>
					{#if isRecipientDoctor(row) && isPendingReferRow(row)}
						<div class="flex flex-wrap items-center gap-1">
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-success"
								disabled={
									acceptingRowId === row.id ||
									cancellingRowId === row.id
								}
								onClick={() => {
									void handleAcceptRow(row);
								}}
							>
								Accept
							</DaisyUiButton>
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-error"
								disabled={
									cancellingRowId === row.id ||
									acceptingRowId === row.id
								}
								onClick={() => {
									void handleRejectRow(row);
								}}
							>
								Reject
							</DaisyUiButton>
						</div>
					{:else}
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm d-btn-error"
							disabled={
								cancellingRowId === row.id ||
								!isPendingReferRow(row)
							}
							onClick={() => {
								void handleCancelRow(row);
							}}
						>
							Cancel
						</DaisyUiButton>
					{/if}
				</svelte:fragment>
			</MariTable>
		</div>
	{/if}
</div>