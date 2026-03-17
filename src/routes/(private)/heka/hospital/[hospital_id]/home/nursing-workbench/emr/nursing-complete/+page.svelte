<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import LucideCircleCheck from '$lib/component/library/lucide/LucideCircleCheck.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
	import { getServiceOrder } from '$lib/remote/table/information-table/service-order.remote';
	import {
		getServiceOrderDetail,
	getServiceOrderDetailPaginated,
		markServiceOrderDetailNursingComplete
	} from '$lib/remote/table/information-table/service-order-detail.remote';
	import { getServiceItem } from '$lib/remote/table/information-table/service-item.remote';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import type {
		ServiceItemSchema,
		ServiceOrderDetailSchema,
		ServiceOrderSchema
	} from '$lib/server/db/schema-type';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	type NursingCompleteRow = {
		id: number;
		orderNo: string | null;
		orderDate: string | null;
	statusId: number | null;
		serviceName: string;
		serviceCode: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
		serviceUnit: number | null;
		lineTotal: number;
		nursingCompleteTime: string | null;
		instruction: string | null;
		isUrgent: boolean | null;
	};

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
		branchId: string;
		visitNo: string | null;
	} | null>(null);
	let rows = $state<NursingCompleteRow[]>([]);
	let isLoading = $state(false);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
let totalRows = $state(0);
let tableFilters = $state<Record<string, string>>({});
let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const subtotal = $derived(
		rows.reduce((sum, row) => sum + parseAmount(row.serviceAmount), 0)
	);
	const totalTax = $derived(
		rows.reduce((sum, row) => sum + parseAmount(row.serviceTaxAmount), 0)
	);
	const grandTotal = $derived(
		rows.reduce((sum, row) => sum + row.lineTotal, 0)
	);

	function parseAmount(value: string | null | undefined): number {
		const num = Number(value ?? 0);
		return Number.isFinite(num) ? num : 0;
	}

	function formatMoney(value: number): string {
		return value.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleDateString();
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleString();
	}

	async function fetchNursingComplete() {
		if (!visitId || !hospitalId) {
			visit = null;
			rows = [];
			return;
		}

		isLoading = true;
		try {
			const currentVisit = await getPatientVisitById({ id: visitId });
			if (!currentVisit) {
				visit = null;
				rows = [];
				return;
			}

			visit = {
				patientId: currentVisit.patientId,
				hospitalId: currentVisit.hospitalId,
				branchId: currentVisit.branchId,
				visitNo: currentVisit.visitNo ?? null
			};

			const orders = await getServiceOrder({ visitId });
			if (orders.length === 0) {
				rows = [];
				return;
			}

			const orderIds = orders.map((o) => o.id);
			const pageSize = Number(pageSizeStr) || 10;
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const detailsResult = await getServiceOrderDetailPaginated({
				serviceOrderIds: orderIds,
				statusId:
					statusId != null && Number.isFinite(statusId)
						? statusId
						: undefined,
				page: currentPage,
				pageSize
			});
			const details = detailsResult.data;
			totalRows = detailsResult.total;
			const services = await getServiceItem({
				hospitalId: currentVisit.hospitalId,
				statusId: null
			});

			const serviceMap = new Map<number, ServiceItemSchema>();
			for (const service of services) {
				serviceMap.set(service.id, service);
			}

			const orderMap = new Map<number, ServiceOrderSchema>();
			for (const order of orders) {
				orderMap.set(order.id, order);
			}

			rows = details.map((detail: ServiceOrderDetailSchema) => {
				const service = serviceMap.get(detail.serviceId);
				const order = orderMap.get(detail.serviceOrderId);
				const amount = parseAmount(detail.serviceAmount);
				const tax = parseAmount(detail.serviceTaxAmount);
				const unit = Number(detail.serviceUnit ?? 1);
				const multiplier =
					Number.isFinite(unit) && unit > 0 ? unit : 1;

				return {
					id: detail.id,
					orderNo: order?.orderNo ?? null,
					orderDate: order?.orderDate ?? null,
					statusId: detail.statusId ?? null,
					serviceName:
						service?.serviceName ?? `Service #${detail.serviceId}`,
					serviceCode: service?.serviceCode ?? null,
					serviceAmount: detail.serviceAmount,
					serviceTaxAmount: detail.serviceTaxAmount,
					serviceUnit: detail.serviceUnit ?? null,
					lineTotal: (amount + tax) * multiplier,
					nursingCompleteTime: detail.nursingCompleteTime ?? null,
					instruction: detail.instruction ?? null,
					isUrgent: detail.isUrgent ?? null
				};
			});
		} catch (error) {
			console.error('Failed to load nursing complete rows', error);
			rows = [];
			totalRows = 0;
		} finally {
			isLoading = false;
		}
	}

	let mounted = $state(false);

	lifeCycleUtil.onMount(() => {
		mounted = true;
		if (visitId) fetchNursingComplete();
	});

	$effect(() => {
		const vid = visitId;
		if (!mounted) return;
		if (vid) {
			fetchNursingComplete();
		} else {
			visit = null;
			rows = [];
		}
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});

	const statusFilterOptions = [
		{ label: 'Active', value: String(StatusEnum.ACTIVE) },
		{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
	];

	const columns: MariTableColumn<NursingCompleteRow>[] = [
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-44 min-w-[11rem]',
			filterable: false
		},
		{
			id: 'orderDate',
			header: 'Order Date',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (value) => formatDate(value as string | null)
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: statusFilterOptions,
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'serviceName',
			header: 'Service Item',
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			format: (_value, row) =>
				row.serviceCode
					? `${row.serviceName} (${row.serviceCode})`
					: row.serviceName
		},
		{
			id: 'serviceAmount',
			header: 'Amount',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (value) => formatMoney(parseAmount(value as string | null))
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (value) => formatMoney(parseAmount(value as string | null))
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (value) => value ?? 1
		},
		{
			id: 'lineTotal',
			header: 'Total',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (value) => formatMoney(Number(value ?? 0))
		},
		{
			id: 'nursingCompleteTime',
			header: 'Nursing Complete Time',
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			format: (value) => formatDateTime(value as string | null)
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (value) => ((value as boolean | null) ? 'Yes' : 'No')
		},
		{
			id: 'instruction',
			header: 'Instruction',
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			format: (value) =>
				(value as string | null | undefined)?.trim() || '—'
		}
	];

	async function handleComplete(row: NursingCompleteRow) {
		try {
			await markServiceOrderDetailNursingComplete({ id: row.id });
			toastService.addToast(
				'Nursing complete time marked',
				StatusColorEnum.SUCCESS
			);
			await fetchNursingComplete();
		} catch (error) {
			console.error('Failed to mark nursing complete', error);
			toastService.addToast(
				'Failed to mark complete',
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to view nursing complete items.'}
			className="z-0"
		/>
	{:else if isLoading}
		<div class="flex min-h-32 items-center justify-center">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else if !visit}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<DaisyUiCard>
			<div class="p-3">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 class="text-lg font-semibold">Nursing Complete</h2>
						<p class="text-sm text-base-content/70">
							Service items and charges for this visit
							{visit.visitNo ? `(Visit: ${visit.visitNo})` : ''}
						</p>
					</div>
					<div class="flex flex-wrap gap-2 text-sm">
						<span class="rounded bg-base-200 px-2 py-1"
							>Subtotal: {formatMoney(subtotal)}</span
						>
						<span class="rounded bg-base-200 px-2 py-1"
							>Tax: {formatMoney(totalTax)}</span
						>
						<span class="rounded bg-primary/20 px-2 py-1 font-semibold"
							>Grand Total: {formatMoney(grandTotal)}</span
						>
					</div>
				</div>

				{#if rows.length === 0}
					<DaisyUiAlert
						type={StatusColorEnum.INFO}
						message="No service items found for this visit yet."
					/>
				{:else}
					<div class="{TableEnum.HEIGHT} flex flex-col gap-3">
						<MariTable
							rows={rows}
							{columns}
							isLoading={isLoading}
							bind:pageSize={pageSizeStr}
							bind:currentPage
							totalRowCount={totalRows}
							showRefreshButton={true}
							refreshTooltip="Refresh data"
							emptyMessage="No service items."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={true}
							useRemoteFilters={true}
							on:refresh={() => fetchNursingComplete()}
							on:pageSizeChange={() => {
								currentPage = 1;
								fetchNursingComplete();
							}}
							on:pageChange={() => fetchNursingComplete()}
							on:filtersChange={(event) => {
								if (filterDebounceTimeout) {
									clearTimeout(filterDebounceTimeout);
								}
								tableFilters = event.detail.filters;
								currentPage = 1;
								filterDebounceTimeout = setTimeout(() => {
									fetchNursingComplete();
								}, 350);
							}}
						>
							<svelte:fragment slot="rowActions" let:row>
								{@const typedRow = row as NursingCompleteRow}
								<td class="w-36 min-w-[9rem]">
									{#if typedRow.nursingCompleteTime}
										<span class="d-badge d-badge-success d-badge-sm"
											>Completed</span
										>
									{:else}
										<DaisyUiButton
											className="d-btn-primary d-btn-xs"
											onClick={() => handleComplete(typedRow)}
										>
											<LucideCircleCheck className="size-3.5" />
											Complete
										</DaisyUiButton>
									{/if}
								</td>
							</svelte:fragment>
						</MariTable>
					</div>
				{/if}
			</div>
		</DaisyUiCard>
	{/if}
</div>
