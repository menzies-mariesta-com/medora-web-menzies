<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getServiceOrder,
		createServiceOrder,
		updateServiceOrder,
		deleteServiceOrder
	} from '$lib/remote/table/information-table/service-order.remote';
import {
		getServiceOrderDetail,
		createServiceOrderDetail,
		updateServiceOrderDetail,
		deleteServiceOrderDetail
	} from '$lib/remote/table/information-table/service-order-detail.remote';
import { getServiceTagging } from '$lib/remote/table/information-table/service-tagging.remote';
import { getServiceItem } from '$lib/remote/table/information-table/service-item.remote';
import type {
		ServiceOrderSchema,
		ServiceOrderDetailSchema,
		ServiceItemSchema
	} from '$lib/server/db/schema-type';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
		branchId: string;
	} | null>(null);

	let orders = $state<ServiceOrderSchema[]>([]);
	let selectedOrderId = $state<number | null>(null);
	let orderDetails = $state<ServiceOrderDetailSchema[]>([]);
let branchServices = $state<ServiceItemSchema[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingOrders = $state(false);
	let isLoadingDetails = $state(false);

	let currentOrderPage = $state(1);
	let orderPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);

	let currentDetailPage = $state(1);
	let detailPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);

	let orderDateInput = $state('');
	let editingOrderId = $state<number | null>(null);

	let detailServiceIdInput = $state('');
let detailDoctorAmountInput = $state('');
let detailDoctorDiscountInput = $state('');
let detailServiceAmountInput = $state('');
let detailServiceTaxAmountInput = $state('');
	let detailServiceUnitInput = $state('');
	let editingDetailId = $state<number | null>(null);

	const toastService = new ToastService();

	function todayDateString(): string {
		const d = new Date();
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function ensureOrderDateDefault() {
		if (!orderDateInput) {
			orderDateInput = todayDateString();
		}
	}

	async function fetchVisit() {
		if (!visitId || !hospitalId) return;
		isLoadingVisit = true;
		try {
			const v = await getPatientVisitById({ id: visitId });
			if (v) {
				visit = {
					patientId: v.patientId,
					hospitalId: v.hospitalId,
					branchId: v.branchId
				};
				await fetchBranchServices(v.hospitalId, v.branchId);
			} else {
				visit = null;
				branchServices = [];
			}
		} finally {
			isLoadingVisit = false;
		}
	}

	async function fetchOrders() {
		if (!visitId) return;
		isLoadingOrders = true;
		try {
			orders = await getServiceOrder({ visitId });
		} finally {
			isLoadingOrders = false;
		}
	}

	async function fetchOrderDetails(orderId: number) {
		isLoadingDetails = true;
		try {
			orderDetails = await getServiceOrderDetail({
				serviceOrderId: orderId
			});
		} finally {
			isLoadingDetails = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		if (vid) {
			fetchVisit().then(() => {
				if (visit?.patientId && visit?.hospitalId) {
					fetchOrders();
				}
			});
		} else {
			visit = null;
			orders = [];
			selectedOrderId = null;
			orderDetails = [];
		}
	});

	function resetOrderForm() {
		editingOrderId = null;
		orderDateInput = todayDateString();
	}

	function startNewOrder() {
		resetOrderForm();
	}

function startEditOrder(order: any) {
		editingOrderId = order.id;
		orderDateInput =
			(order.orderDate as string | null | undefined) ??
			todayDateString();
	}

	function generateOrderNo(existingOrdersForVisit: ServiceOrderSchema[]) {
		const dateStr = orderDateInput || todayDateString();
		const yearSuffix = dateStr.slice(2, 4);
		const seq = existingOrdersForVisit.length + 1;
		return `${yearSuffix}/${visitId}/${seq}`;
	}

	async function handleSaveOrder() {
		if (!visitId || !visit?.branchId) return;
		ensureOrderDateDefault();
		const dateStr = orderDateInput || todayDateString();
		try {
			if (editingOrderId) {
				await updateServiceOrder({
					id: editingOrderId,
					orderDate: dateStr
				});
				toastService.addToast(
					'Order updated.',
					StatusColorEnum.SUCCESS
				);
			} else {
				const existing = orders.filter(
					(o) => o.visitId === visitId
				);
				const orderNo = generateOrderNo(existing);
				const created = await createServiceOrder({
					branchId: visit.branchId,
					visitId,
					orderDate: dateStr,
					orderNo
				});
				selectedOrderId = created.id;
				toastService.addToast(
					'Order created.',
					StatusColorEnum.SUCCESS
				);
			}
			await fetchOrders();
			if (selectedOrderId) {
				await fetchOrderDetails(selectedOrderId);
			}
			resetOrderForm();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Save failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

async function handleDeleteOrder(order: any) {
		const result = await dialogService.open({
			title: 'Delete order',
			message:
				'Delete this order and all its items? This cannot be undone.',
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceOrder({ id: order.id });
			toastService.addToast(
				'Order deleted.',
				StatusColorEnum.SUCCESS
			);
			if (selectedOrderId === order.id) {
				selectedOrderId = null;
				orderDetails = [];
			}
			await fetchOrders();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

function handleSelectOrder(order: any) {
		selectedOrderId = order.id;
		fetchOrderDetails(order.id);
	}

function resetDetailForm() {
	editingDetailId = null;
	detailServiceIdInput = '';
	detailDoctorAmountInput = '';
	detailDoctorDiscountInput = '';
	detailServiceAmountInput = '';
	detailServiceTaxAmountInput = '';
	detailServiceUnitInput = '';
}

async function fetchBranchServices(
	hospitalIdForVisit: string,
	branchIdForVisit: string
) {
	try {
		// Find all tagged services for this branch
		const taggings = await getServiceTagging({
			branchId: branchIdForVisit
		});
		const serviceIds = Array.from(
			new Set(taggings.map((t) => t.serviceId).filter((id) => id != null))
		);
		if (serviceIds.length === 0) {
			branchServices = [];
			return;
		}

		// Load all active services for this hospital and filter to tagged IDs
		const allServices = await getServiceItem({
			hospitalId: hospitalIdForVisit,
			statusId: null
		});
		const idSet = new Set(serviceIds);
		branchServices = allServices.filter((s) => idSet.has(s.id));
	} catch (err) {
		console.error('Failed to load branch services', err);
		branchServices = [];
	}
}

function parseNumberOrNull(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		return Number.isFinite(n) ? n : null;
	}

function parseDecimalOrNull(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const n = Number(trimmed);
	if (!Number.isFinite(n)) return null;
	return trimmed;
}

	async function handleSaveDetail() {
		if (!selectedOrderId) return;
		const serviceId = parseNumberOrNull(detailServiceIdInput);
		if (!serviceId) {
			toastService.addToast(
				'Service ID is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
	const doctorAmount = parseDecimalOrNull(
		detailDoctorAmountInput
	);
	const doctorDiscount = parseDecimalOrNull(
		detailDoctorDiscountInput
	);
	const serviceAmount = parseDecimalOrNull(
		detailServiceAmountInput
	);
	const serviceTaxAmount = parseDecimalOrNull(
		detailServiceTaxAmountInput
	);
	const serviceUnit = parseNumberOrNull(detailServiceUnitInput);

	const basePayload = {
			serviceOrderId: selectedOrderId,
			serviceId,
			doctorAmount,
			doctorDiscount,
			serviceAmount,
			serviceTaxAmount,
			serviceUnit
		};

		try {
			if (editingDetailId) {
				await updateServiceOrderDetail({
					id: editingDetailId,
					...basePayload
				});
				toastService.addToast(
					'Order item updated.',
					StatusColorEnum.SUCCESS
				);
			} else {
				await createServiceOrderDetail(basePayload);
				toastService.addToast(
					'Order item added.',
					StatusColorEnum.SUCCESS
				);
			}
			await fetchOrderDetails(selectedOrderId);
			resetDetailForm();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Save failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function startEditDetail(row: any) {
		editingDetailId = row.id;
		detailServiceIdInput = String(row.serviceId ?? '');
		detailDoctorAmountInput = row.doctorAmount
			? String(row.doctorAmount)
			: '';
		detailDoctorDiscountInput = row.doctorDiscount
			? String(row.doctorDiscount)
			: '';
		detailServiceAmountInput = row.serviceAmount
			? String(row.serviceAmount)
			: '';
		detailServiceTaxAmountInput = row.serviceTaxAmount
			? String(row.serviceTaxAmount)
			: '';
		detailServiceUnitInput = row.serviceUnit
			? String(row.serviceUnit)
			: '';
	}

	async function handleDeleteDetail(row: any) {
		const result = await dialogService.open({
			title: 'Delete order item',
			message: 'Delete this item from the order? This cannot be undone.',
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceOrderDetail({ id: row.id });
			toastService.addToast(
				'Order item deleted.',
				StatusColorEnum.SUCCESS
			);
			if (selectedOrderId) {
				await fetchOrderDetails(selectedOrderId);
			}
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '–';
		try {
			return new Date(value).toLocaleDateString('en-US', {
				dateStyle: 'short'
			});
		} catch {
			return '–';
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '–';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '–';
		}
	}

	function formatNumber(
		value: number | string | null | undefined
	): string {
		if (value == null || value === '') return '–';
		const n = Number(value);
		if (!Number.isFinite(n)) return String(value);
		return n.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		});
	}

	const orderColumns: MariTableColumn<ServiceOrderSchema>[] = [
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => (value ? String(value) : '–')
		},
		{
			id: 'orderDate',
			header: 'Order Date',
			widthClass: 'w-32',
			filterable: false,
			format: (value) =>
				formatDate(value as string | null | undefined)
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) =>
				formatDateTime(row.createdAt as string | null | undefined)
		}
	];

	const detailColumns: MariTableColumn<ServiceOrderDetailSchema>[] = [
		{
			id: 'serviceId',
			header: 'Service ID',
			widthClass: 'w-24',
			filterable: false,
			format: (value) => (value != null ? String(value) : '–')
		},
		{
			id: 'doctorAmount',
			header: 'Doctor Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'doctorDiscount',
			header: 'Doctor Discount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'serviceAmount',
			header: 'Service Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax Amount',
			widthClass: 'w-28',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-20',
			filterable: false,
			format: (value) => (value != null ? String(value) : '–')
		}
	];
</script>

<svelte:head>
	<title>Order</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message='Choose a visit using the "Choose Visit" button above to place orders.'
			className="z-0"
		/>
	{:else if isLoadingVisit}
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
			<DaisyUiCardBody>
				<div class="mb-5 flex flex-col gap-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<DaisyUiCardBodyTitle className="mb-0">
							Order header
						</DaisyUiCardBodyTitle>
						<div class="flex flex-wrap items-center gap-2">
							<label class="flex items-center gap-2 text-sm">
								<span>Order date</span>
								<input
									type="date"
									class="d-input d-input-bordered d-input-sm"
									bind:value={orderDateInput}
								/>
							</label>
							<DaisyUiButton
								className="d-btn-primary d-btn-sm gap-1.5"
								onClick={handleSaveOrder}
							>
								<LucidePlus className="size-4 shrink-0" />
								{editingOrderId ? 'Save order' : 'Create order'}
							</DaisyUiButton>
						</div>
					</div>

					{#if selectedOrderId}
						<div class="flex flex-col gap-3">
							<h2 class="text-base font-semibold">
								Order items (Order #{selectedOrderId})
							</h2>

							<div class="flex flex-wrap items-end gap-3">
							<label class="flex flex-col gap-1 text-sm">
								Service
								<DaisyUiSelect
									className="d-select d-select-bordered d-select-sm w-64"
									bind:value={detailServiceIdInput}
									optionHeader="Select service"
								>
									{#each branchServices as s (s.id)}
										<option value={String(s.id)}>
											{s.serviceName ?? `Service ${s.id}`}{s.serviceCode ? ` - ${s.serviceCode}` : ''}
										</option>
									{/each}
								</DaisyUiSelect>
							</label>
								<label class="flex flex-col gap-1 text-sm">
									Doctor Amount
									<input
										type="number"
										step="0.01"
										class="d-input d-input-bordered d-input-sm"
										bind:value={detailDoctorAmountInput}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									Doctor Discount
									<input
										type="number"
										step="0.01"
										class="d-input d-input-bordered d-input-sm"
										bind:value={detailDoctorDiscountInput}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									Service Amount
									<input
										type="number"
										step="0.01"
										class="d-input d-input-bordered d-input-sm"
										bind:value={detailServiceAmountInput}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									Tax Amount
									<input
										type="number"
										step="0.01"
										class="d-input d-input-bordered d-input-sm"
										bind:value={detailServiceTaxAmountInput}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									Unit
									<input
										type="number"
										step="1"
										min="1"
										class="d-input d-input-bordered d-input-sm"
										bind:value={detailServiceUnitInput}
									/>
								</label>
								<div class="flex gap-2">
									<DaisyUiButton
										className="d-btn-primary d-btn-sm mt-4 gap-1.5"
										onClick={handleSaveDetail}
									>
										<LucidePlus className="size-4 shrink-0" />
										{editingDetailId
											? 'Save item'
											: 'Add item'}
									</DaisyUiButton>
									{#if editingDetailId}
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm mt-4"
											onClick={resetDetailForm}
										>
											Cancel
										</DaisyUiButton>
									{/if}
								</div>
							</div>
						</div>
					{:else if orders.length > 0}
						<p class="text-sm text-base-content/70">
							Select an order to add items.
						</p>
					{/if}
				</div>

				<div class="flex flex-col gap-6">
					<div>
						<h2 class="mb-2 text-base font-semibold">
							Service orders for this visit
						</h2>
						{#if isLoadingOrders}
							<div class="flex min-h-32 items-center justify-center">
								<DaisyUiLoading className="d-loading-lg" />
							</div>
						{:else if orders.length === 0}
							<p class="text-sm text-base-content/70">
								No orders for this visit yet.
							</p>
						{:else}
							<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
								<MariTable
									rows={orders}
									columns={orderColumns}
									isLoading={isLoadingOrders}
									bind:pageSize={orderPageSizeStr}
									bind:currentPage={currentOrderPage}
									showRefreshButton={true}
									emptyMessage="No orders."
									showRowActions={true}
									actionsHeader="Actions"
									actionsVariant="none"
									enableColumnFilters={false}
									on:refresh={fetchOrders}
								>
									<svelte:fragment slot="rowActions" let:row>
										<td class="w-32 shrink-0 text-right">
											<div class="flex justify-end gap-1">
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm"
													onClick={() => {
														handleSelectOrder(row);
														startEditOrder(row);
													}}
												>
													<LucidePencil className="size-4" />
												</DaisyUiButton>
												<DaisyUiButton
													className="d-btn-ghost d-btn-error d-btn-sm"
													onClick={() =>
														handleDeleteOrder(row)
													}
												>
													<LucideTrash2 className="size-4" />
												</DaisyUiButton>
											</div>
										</td>
									</svelte:fragment>
								</MariTable>
							</div>
						{/if}
					</div>

					<div>
						<h2 class="mb-2 text-base font-semibold">
							Order items
						</h2>
						{#if !selectedOrderId}
							<p class="text-sm text-base-content/70">
								Select an order above to view its items.
							</p>
						{:else if isLoadingDetails}
							<div class="flex min-h-24 items-center justify-center">
								<DaisyUiLoading className="d-loading-lg" />
							</div>
						{:else if orderDetails.length === 0}
							<p class="text-sm text-base-content/70">
								No items in this order yet.
							</p>
						{:else}
							<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
								<MariTable
									rows={orderDetails}
									columns={detailColumns}
									isLoading={isLoadingDetails}
									bind:pageSize={detailPageSizeStr}
									bind:currentPage={currentDetailPage}
									showRefreshButton={true}
									emptyMessage="No items."
									showRowActions={true}
									actionsHeader="Actions"
									actionsVariant="none"
									enableColumnFilters={false}
									on:refresh={() => {
										if (selectedOrderId) {
											fetchOrderDetails(selectedOrderId);
										}
									}}
								>
									<svelte:fragment slot="rowActions" let:row>
										<td class="w-28 shrink-0 text-right">
											<div class="flex justify-end gap-1">
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm"
													onClick={() =>
														startEditDetail(row)
													}
												>
													<LucidePencil className="size-4" />
												</DaisyUiButton>
												<DaisyUiButton
													className="d-btn-ghost d-btn-error d-btn-sm"
													onClick={() =>
														handleDeleteDetail(row)
													}
												>
													<LucideTrash2 className="size-4" />
												</DaisyUiButton>
											</div>
										</td>
									</svelte:fragment>
								</MariTable>
							</div>
						{/if}
					</div>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>

