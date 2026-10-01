<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import LIpdVisitRequiredAlert from '$lib/component/own/local/private/medora/visit/LIpdVisitRequiredAlert.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { IpAdvanceDepositRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const visitId = $derived(VisitState.visitId);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/billing/ip-billing/advance-deposit`
			: ''
	);

	let rows = $state<IpAdvanceDepositRow[]>([]);
	let admissionId = $state<number | null>(null);
	let totalAmount = $state(0);
	let isLoading = $state(false);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	let isAddOpen = $state(false);
	let depositAmount = $state('');
	let depositNotes = $state('');
	let paymentMethod = $state('cash');
	let isSubmitting = $state(false);

	const paymentMethodOptions = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'transfer', label: 'Transfer' },
		{ value: 'other', label: 'Other' }
	];

	const pageSize = $derived(Number(pageSizeStr) || 10);
	const pagedRows = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return rows.slice(start, start + pageSize);
	});
	const totalPages = $derived(
		Math.max(1, Math.ceil(rows.length / pageSize) || 1)
	);

	const columns: MenziesTableColumn<IpAdvanceDepositRow>[] = [
		{
			id: 'receiptNo',
			header: 'Receipt No',
			widthClass: 'w-44 min-w-[10rem]',
			field: 'receiptNo',
			filterable: true,
			format: (_v, row) => row.receiptNo ?? '—'
		},
		{
			id: 'paidAt',
			header: 'Received at',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => {
				if (!row.paidAt) return '—';
				const d = new Date(row.paidAt);
				return Number.isNaN(d.getTime())
					? row.paidAt
					: d.toLocaleString();
			}
		},
		{
			id: 'amount',
			header: 'Amount',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_v, row) =>
				formatMoneyAmount(Number(row.amount) || 0)
		},
		{
			id: 'paymentMethod',
			header: 'Method',
			widthClass: 'w-28 min-w-[6rem]',
			field: 'paymentMethod',
			filterable: true
		},
		{
			id: 'paidByStaffName',
			header: 'Added by',
			widthClass: 'w-44 min-w-[10rem]',
			filterable: true,
			format: (_v, row) => row.paidByStaffName ?? '—'
		},
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'visitNo',
			filterable: true,
			format: (_v, row) => row.visitNo ?? '—'
		},
		{
			id: 'admissionNo',
			header: 'Admission No',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'admissionNo',
			filterable: true,
			format: (_v, row) => row.admissionNo ?? '—'
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true,
			format: (_v, row) => {
				const code = row.patientCode?.trim();
				const name = row.patientName?.trim();
				if (code && name) return `${code} · ${name}`;
				return name || code || '—';
			}
		},
		{
			id: 'notes',
			header: 'Notes',
			widthClass: 'min-w-[10rem]',
			filterable: false,
			format: (_v, row) => row.notes?.trim() || '—'
		}
	];

	const canAdd = $derived(!!visitId && admissionId != null && !!api);

	async function fetchRows() {
		if (!api || !visitId) {
			rows = [];
			admissionId = null;
			totalAmount = 0;
			return;
		}
		isLoading = true;
		try {
			const qs = new URLSearchParams({
				visitId: String(visitId)
			});
			const search =
				tableFilters.receiptNo?.trim() ||
				tableFilters.patientName?.trim() ||
				tableFilters.visitNo?.trim() ||
				tableFilters.admissionNo?.trim() ||
				tableFilters.paidByStaffName?.trim() ||
				tableFilters.paymentMethod?.trim() ||
				'';
			if (search) qs.set('search', search);
			const res = await fetch(`${api}?${qs.toString()}`, {
				credentials: 'include'
			});
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as {
				items?: IpAdvanceDepositRow[];
				admissionId?: number | null;
				totalAmount?: number;
			};
			rows = data.items ?? [];
			admissionId =
				typeof data.admissionId === 'number' && data.admissionId > 0
					? data.admissionId
					: null;
			totalAmount = Number(data.totalAmount ?? 0) || 0;
		} catch (e) {
			rows = [];
			admissionId = null;
			totalAmount = 0;
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to load deposits',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function submitDeposit() {
		if (!canAdd || !api || !visitId) return;
		const amt = Number(depositAmount);
		if (!Number.isFinite(amt) || amt <= 0) {
			toastService.addToast(
				'Enter a deposit amount greater than 0',
				StatusColorEnum.WARNING
			);
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					visitId: Number(visitId),
					admissionId,
					amount: String(amt),
					paymentMethod,
					notes: depositNotes.trim() || null
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				'Advance deposit recorded',
				StatusColorEnum.SUCCESS
			);
			isAddOpen = false;
			depositAmount = '';
			depositNotes = '';
			paymentMethod = 'cash';
			await fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to record deposit',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		void vid;
		currentPage = 1;
		void fetchRows();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<LIpdVisitRequiredAlert
	hospitalId={hospitalId}
	{visitId}
	message="IP Billing Advance Deposit requires an IPD visit. Select an admitted inpatient visit to continue."
>
{#if !visitId}
	<WashAlert
		type={StatusColorEnum.INFO}
		message="Select an IPD visit to view and record advance deposits."
		className="mb-3 z-0"
	/>
{:else if !isLoading && admissionId == null}
	<WashAlert
		type={StatusColorEnum.WARNING}
		message="No IPD admission found for this visit. Deposits can only be recorded after admission."
		className="mb-3 z-0"
	/>
{/if}

<div class={TableEnum.HEIGHT}>
	<MenziesTable
		title="Advance Deposits"
		rows={pagedRows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={rows.length}
		showRefreshButton={true}
		emptyMessage={visitId
			? 'No deposits recorded for this visit'
			: 'Select a visit to load deposits'}
		showRowActions={false}
		enableColumnFilters={true}
		showAddButton={canAdd}
		addLabel="Add deposit"
		onAdd={() => {
			depositAmount = '';
			depositNotes = '';
			paymentMethod = 'cash';
			isAddOpen = true;
		}}
		on:refresh={() => fetchRows()}
		on:pageSizeChange={() => {
			currentPage = 1;
		}}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				void fetchRows();
			}, 350);
		}}
	/>
</div>

{#if visitId && rows.length > 0}
	<p class="mt-2 text-sm text-base-content/70">
		Total collected: <span class="font-mono font-medium tabular-nums"
			>{formatMoneyAmount(totalAmount)}</span
		>
		· Page {currentPage} of {totalPages}
	</p>
{/if}

{#if isAddOpen}
	<WashDialog
		id="ip-advance-deposit-add-modal"
		open={true}
		onClose={() => {
			if (!isSubmitting) isAddOpen = false;
		}}
		title="Add advance deposit"
		description="Record a payment received against this IPD admission."
		boxClassName="max-w-md"
		showActions={false}
	>
		<div class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
			<label class="flex min-w-0 flex-col gap-1 text-sm">
				Amount
				<WashInputField
					id="ip-adv-dep-amount"
					bind:value={depositAmount}
					inputType="number"
					inputPlaceholderText="0.00"
				/>
			</label>
			<label class="flex min-w-0 flex-col gap-1 text-sm">
				Payment method
				<WashSelect
					bind:value={paymentMethod}
					options={paymentMethodOptions}
				/>
			</label>
			<label class="flex min-w-0 flex-col gap-1 text-sm">
				Notes (optional)
				<WashInputField
					id="ip-adv-dep-notes"
					bind:value={depositNotes}
					inputPlaceholderText="Optional"
				/>
			</label>
		</div>
		<WashDialogFooter>
			<WashButton
				type="button"
				className="btn-ghost"
				disabled={isSubmitting}
				onClick={() => (isAddOpen = false)}
			>
				Cancel
			</WashButton>
			<WashButton
				type="button"
				className="btn-primary"
				disabled={isSubmitting}
				loading={isSubmitting}
				onClick={() => void submitDeposit()}
			>
				Record deposit
			</WashButton>
		</WashDialogFooter>
	</WashDialog>
{/if}
</LIpdVisitRequiredAlert>
