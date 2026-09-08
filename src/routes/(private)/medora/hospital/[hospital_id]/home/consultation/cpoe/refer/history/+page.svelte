<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import MariTable from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import MariTableRowActionGroup from '$lib/component/own/library/mari/table/MariTableRowActionGroup.svelte';
	import MariTableIconAction from '$lib/component/own/library/mari/table/MariTableIconAction.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LReferFeedbackDialogContent from '$lib/component/own/local/private/medora/cpoe/refer/LReferFeedbackDialogContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	type ReferHistoryWithRelations = {
		id: number;
		visitId: number;
		referAt: string | null;
		subject: string | null;
		fromBranch: { name?: string | null } | null;
		toBranch: { name?: string | null } | null;
		fromReferDoctorId: string | null;
		toReferDoctorId: string | null;
		fromReferDoctor: any;
		toReferDoctor: any;
		isUrgent: number | null;
		referRequestNote: string | null;
		referReplyNote: string | null;
		acceptAt: string | null;
		cancelAt: string | null;
		cancelBy: string | null;
		cancelRemark: string | null;
		createdAt: string | null;
	};

	let rows = $state<ReferHistoryWithRelations[]>([]);
	let totalRowCount = $state(0);
	let isLoading = $state(false);
	let pageSize = $state('25');
	let currentPage = $state(1);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastReferHistoryFetchKey = $state('');
	let cancellingRowId = $state<number | null>(null);
	let acceptingRowId = $state<number | null>(null);
	const toastService = new ToastService();

	const visitId = $derived(VisitState.visitId);
	const hospitalId = $derived(page.params.hospital_id);
	const referHistoryApiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/consultation/cpoe/refer/history`
			: ''
	);
	const currentStaffId = $derived(
		page.data.staff?.id != null ? String(page.data.staff.id) : null
	);

	function isAcceptedReferRow(row: ReferHistoryWithRelations) {
		return row.acceptAt != null && String(row.acceptAt).trim() !== '';
	}

	function isPendingReferRow(row: ReferHistoryWithRelations) {
		return !isAcceptedReferRow(row) && row.cancelAt == null;
	}

	/** Reject sets cancel_at; recipient is to_refer_doctor — match cancel_by user to to-doctor's user. */
	function isReferRejected(row: ReferHistoryWithRelations) {
		if (row.cancelAt == null) return false;
		const uid = row.cancelBy?.trim();
		const toUserId = row.toReferDoctor?.userId;
		if (!uid || toUserId == null || String(toUserId).trim() === '')
			return false;
		return String(toUserId) === String(uid);
	}

	function isRecipientDoctor(row: ReferHistoryWithRelations) {
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

	function formatAcceptedAt(acceptAt: unknown): string {
		if (acceptAt != null && String(acceptAt).trim() !== '') {
			return formatDateTime(acceptAt);
		}
		return '—';
	}

	const rowLegends = [
		{ id: 'active', label: 'Active', colorClass: 'bg-neutral/5' },
		{ id: 'urgent', label: 'Urgent', colorClass: 'bg-warning/25' },
		{
			id: 'accepted',
			label: 'Accepted',
			colorClass: 'bg-success/25'
		},
		{
			id: 'rejected',
			label: 'Rejected',
			colorClass: 'bg-orange-400/25'
		},
		{ id: 'canceled', label: 'Canceled', colorClass: 'bg-error/25' }
	];

	const columns: MariTableColumn<ReferHistoryWithRelations>[] = [
		{
			id: 'referAt',
			header: 'Refer At',
			field: 'referAt',
			filterable: false,
			widthClass: 'min-w-[11rem]',
			format: (v) => formatDateTime(v)
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
			format: (_, row) => formatAcceptedAt(row.acceptAt)
		},
		{
			id: 'referReplyNote',
			header: 'Reply note',
			field: 'referReplyNote',
			filterable: false,
			widthClass: 'min-w-[10rem]'
		},
		{
			id: 'cancelRemark',
			header: 'Cancel reason',
			field: 'cancelRemark',
			filterable: false,
			widthClass: 'min-w-[10rem]'
		},
		{
			id: 'cancelAt',
			header: 'Canceled At',
			field: 'cancelAt',
			filterable: false,
			widthClass: 'min-w-[11rem]',
			format: (v) => formatDateTime(v)
		},
		{
			id: 'createdAt',
			header: 'Created At',
			field: 'createdAt',
			filterable: false,
			widthClass: 'min-w-[11rem]',
			format: (v) => formatDateTime(v)
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
			const url = new URL(
				referHistoryApiBase,
				window.location.origin
			);
			url.searchParams.set('mode', 'referHistory.paginated');
			url.searchParams.set('visitId', String(visitId));
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set(
				'pageSize',
				String(parseInt(pageSize, 10))
			);
			url.searchParams.set(
				'filters',
				JSON.stringify(tableFilters ?? {})
			);
			const r = await fetch(url.toString(), { method: 'GET' });
			if (!r.ok)
				throw new Error(`Failed to load history (${r.status})`);
			const res = (await r.json()) as {
				data: ReferHistoryWithRelations[];
				total: number;
			};
			rows = res.data ?? [];
			totalRowCount = res.total ?? 0;
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
			note: string | null;
		}>({
			title: 'Cancel referral',
			component: LReferFeedbackDialogContent,
			props: {
				label: 'Cancel Reason',
				placeholder: 'Enter reason for cancelling...',
				confirmLabel: 'Confirm Cancel',
				required: true
			}
		});

		if (!res.confirmed) return;
		const cancelReason = res.data?.note;
		if (!cancelReason) return;

		cancellingRowId = row.id as number;
		try {
			const r = await fetch(referHistoryApiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'referHistory.cancel',
					id: row.id as number,
					cancelReason
				})
			});
			if (!r.ok) throw new Error(`Cancel failed (${r.status})`);
			toastSuccess(
				toastService,
				m.entity_referral(),
				m.toast_action_cancelled()
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addErrorToast(
				'Could not cancel this referral',
				err
			);
		} finally {
			cancellingRowId = null;
		}
	}

	async function handleRejectRow(row: ReferHistoryWithRelations) {
		if (!row?.id) return;
		if (!isPendingReferRow(row)) return;

		const res = await dialogService.open<{
			note: string | null;
		}>({
			title: 'Reject referral',
			component: LReferFeedbackDialogContent,
			props: {
				label: 'Reject Note',
				placeholder:
					'Enter internal note for rejection (optional)...',
				confirmLabel: 'Confirm Reject',
				required: false
			}
		});

		if (!res.confirmed) return;
		const replyNote = res.data?.note;

		cancellingRowId = row.id as number;
		try {
			const r = await fetch(referHistoryApiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'referHistory.reject',
					id: row.id as number,
					replyNote
				})
			});
			if (!r.ok) throw new Error(`Reject failed (${r.status})`);
			toastSuccess(
				toastService,
				m.entity_referral(),
				m.toast_action_rejected()
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addErrorToast(
				'Could not reject this referral',
				err
			);
		} finally {
			cancellingRowId = null;
		}
	}

	async function handleAcceptRow(row: ReferHistoryWithRelations) {
		if (!row?.id) return;
		if (!isPendingReferRow(row)) return;

		const res = await dialogService.open<{
			note: string | null;
		}>({
			title: 'Accept referral',
			component: LReferFeedbackDialogContent,
			props: {
				label: 'Reply Note',
				placeholder:
					'Enter internal note for acceptance (optional)...',
				confirmLabel: 'Confirm Accept',
				required: false
			}
		});

		if (!res.confirmed) return;
		const replyNote = res.data?.note;

		acceptingRowId = row.id as number;
		try {
			const r = await fetch(referHistoryApiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'referHistory.accept',
					id: row.id as number,
					replyNote
				})
			});
			if (!r.ok) throw new Error(`Accept failed (${r.status})`);
			toastSuccess(
				toastService,
				m.entity_referral(),
				m.toast_action_accepted()
			);
			await loadData({ force: true });
		} catch (err) {
			toastService.addErrorToast(
				'Could not accept this referral',
				err
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
		<WashAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the 'Choose Visit' button above to view referral history."
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
					if (row.cancelAt != null) {
						if (isReferRejected(row)) return '!bg-orange-400/15';
						return '!bg-error/15';
					}
					if (isAcceptedReferRow(row)) return '!bg-success/15';
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

					if (filterDebounceTimeout)
						clearTimeout(filterDebounceTimeout);
					filterDebounceTimeout = setTimeout(() => {
						loadData();
					}, 350);
				}}
				showRowActions={true}
				actionsHeader="Actions"
				actionsVariant="none"
			>
				{#snippet rowActions(row, rowIndex)}
					{@const typedRow = row as ReferHistoryWithRelations}
					{#if isRecipientDoctor(typedRow) && isPendingReferRow(typedRow)}
						<MariTableRowActionGroup>
							<MariTableIconAction
								tooltipText="Accept"
								color="primary"
								disabled={acceptingRowId === typedRow.id ||
									cancellingRowId === typedRow.id}
								onClick={() => {
									void handleAcceptRow(typedRow);
								}}
							>
								{#snippet icon()}
									<LucideCircleCheck className="size-4" />
								{/snippet}
							</MariTableIconAction>
							<MariTableIconAction
								tooltipText="Reject"
								color="error"
								disabled={cancellingRowId === typedRow.id ||
									acceptingRowId === typedRow.id}
								onClick={() => {
									void handleRejectRow(typedRow);
								}}
							>
								{#snippet icon()}
									<LucideCircleX className="size-4" />
								{/snippet}
							</MariTableIconAction>
						</MariTableRowActionGroup>
					{:else}
						<MariTableRowActionGroup>
							<MariTableIconAction
								tooltipText="Cancel"
								color="warning"
								disabled={cancellingRowId === typedRow.id ||
									!isPendingReferRow(typedRow)}
								onClick={() => {
									void handleCancelRow(typedRow);
								}}
							>
								{#snippet icon()}
									<LucideBan className="size-4" />
								{/snippet}
							</MariTableIconAction>
						</MariTableRowActionGroup>
					{/if}
				{/snippet}
			</MariTable>
		</div>
	{/if}
</div>
