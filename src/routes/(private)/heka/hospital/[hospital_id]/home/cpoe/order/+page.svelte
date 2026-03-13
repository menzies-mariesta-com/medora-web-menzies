<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getServiceOrder,
		createServiceOrder
	} from '$lib/remote/table/information-table/service-order.remote';
	import {
		getServiceOrderDetail,
		createServiceOrderDetail,
		updateServiceOrderDetail,
		deleteServiceOrderDetail
	} from '$lib/remote/table/information-table/service-order-detail.remote';
	import { getServiceTagging } from '$lib/remote/table/information-table/service-tagging.remote';
	import {
		getServiceItem,
		getServiceItemPaginated
	} from '$lib/remote/table/information-table/service-item.remote';
	import {
		getDoctorStaffPaginated,
		getStaffByIdWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { StringUtil } from '$lib/util/string.util.svelte';
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
	import LNursingEmrOrderHistoryDialog from '$lib/component/local/private/heka/nursing-workbench/emr/order/LNursingEmrOrderHistoryDialog.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';

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

	let currentOrder = $state<ServiceOrderSchema | null>(null);
	let orderDateInput = $state(todayDateString());
	let orderTimeInput = $state(
		new Date().toTimeString().slice(0, 5) // HH:MM
	);

	type PendingItem = {
		id: number;
		serviceId: number;
		advisingDoctorId: string | null;
		advisingDoctorName: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
		serviceUnit: number;
		instruction: string | null;
		isUrgent: boolean;
	};

	type HistoryItem = ServiceOrderDetailSchema & {
		orderNo: string | null;
		advisingDoctorName: string | null;
	};

	let pendingItems = $state<PendingItem[]>([]);
	let branchServices = $state<ServiceItemSchema[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingHistory = $state(false);

let currentDetailPage = $state(1);
let detailPageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);

	let serviceFilter = $state<'all' | 'radiology' | 'laboratory' | 'nursing'>(
		'all'
	);

	let detailServiceIdInput = $state('');
	let detailAdvisingDoctorIdInput = $state('');
	let detailServiceAmountInput = $state('');
	let detailServiceTaxAmountInput = $state('');
	let detailServiceUnitInput = $state('1');
	let detailInstructionInput = $state('');
	let detailIsUrgentInput = $state(false);
	let editingDetailId = $state<number | null>(null);
	let detailAmountEditable = $state(true);

	let historyItems = $state<HistoryItem[]>([]);
let showHistory = $state(false);

	const toastService = new ToastService();

	function todayDateString(): string {
		const d = new Date();
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
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
					branchId: v.branchId,
					visitNo: v.visitNo ?? null
				};
				await fetchBranchServices(v.hospitalId, v.branchId);
				pendingItems = [];
			} else {
				visit = null;
				branchServices = [];
				currentOrder = null;
				pendingItems = [];
			}
		} finally {
			isLoadingVisit = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		if (vid) {
			fetchVisit();
		} else {
			visit = null;
			currentOrder = null;
			pendingItems = [];
		}
	});

	function resetDetailForm() {
		editingDetailId = null;
		detailServiceIdInput = '';
		detailAdvisingDoctorIdInput = '';
		detailServiceAmountInput = '';
		detailServiceTaxAmountInput = '';
		detailServiceUnitInput = '1';
		detailInstructionInput = '';
		detailIsUrgentInput = false;
		detailAmountEditable = true;
	}

	async function fetchBranchServices(
		hospitalIdForVisit: string,
		branchIdForVisit: string
	) {
		try {
			const taggings = await getServiceTagging({
				branchId: branchIdForVisit
			});
			const serviceIds = Array.from(
				new Set(
					taggings.map((t) => t.serviceId).filter((id) => id != null)
				)
			);
			if (serviceIds.length === 0) {
				branchServices = [];
				return;
			}

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

	async function searchDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const res = await getDoctorStaffPaginated({
			search: query.trim(),
			hospitalId,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		return res.data.map((staff) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const staff = await getStaffByIdWithRelations({ id });
		if (!staff) return '';
		return StringUtil.doctorOptionDisplayName(staff);
	}

	async function searchServices(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const res = await getServiceItemPaginated({
			hospitalId,
			serviceName: query.trim(),
			statusId: StatusEnum.ACTIVE,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		const allowedIds = new Set(branchServices.map((s) => s.id));
		return res.data
			.filter(
				(service) =>
					allowedIds.has(service.id) &&
					serviceMatchesFilter(service, serviceFilter)
			)
			.map((service) => ({
				label: StringUtil.serviceOptionDisplayName(service),
				value: String(service.id)
			}));
	}

	async function getServiceLabelForValue(id: string): Promise<string> {
		const serviceId = Number(id);
		const cachedService = branchServices.find((s) => s.id === serviceId);
		if (cachedService) {
			return `${cachedService.serviceName ?? `Service ${cachedService.id}`}${cachedService.serviceCode ? ` - ${cachedService.serviceCode}` : ''}`;
		}
		const fetchedService = await getServiceItem({
			id: serviceId,
			hospitalId,
			statusId: null
		});
		const service = fetchedService[0];
		if (!service) return '';
		return `${service.serviceName ?? `Service ${service.id}`}${service.serviceCode ? ` - ${service.serviceCode}` : ''}`;
	}

	function parseNumberOrNull(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		return Number.isFinite(n) ? n : null;
	}

	function parseDecimalOrNull(
		value: string | number | null | undefined
	): string | null {
		if (value == null) return null;
		const trimmed =
			typeof value === 'string' ? value.trim() : String(value).trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		if (!Number.isFinite(n)) return null;
		return trimmed;
	}

	function serviceMatchesFilter(
		service: ServiceItemSchema,
		filter: typeof serviceFilter
	): boolean {
		if (filter === 'all') return true;
		const name = (service.serviceName ?? '').toLowerCase();
		if (filter === 'radiology') return name.includes('radio');
		if (filter === 'laboratory') return name.includes('lab');
		if (filter === 'nursing') return name.includes('nurs');
		return true;
	}

	const filteredBranchServices = $derived(
		branchServices.filter((s) => serviceMatchesFilter(s, serviceFilter))
	);

	async function applyPricingForSelectedService() {
		const branchIdForVisit = visit?.branchId;
		if (!branchIdForVisit) return;
		const serviceId = parseNumberOrNull(detailServiceIdInput);
		if (!serviceId) return;
		try {
			const taggings = await getServiceTagging({
				branchId: branchIdForVisit,
				serviceId
			});
			const t = taggings[0];
			if (!t) {
				detailAmountEditable = true;
				return;
			}
			detailServiceAmountInput =
				t.serviceAmount != null ? String(t.serviceAmount) : '';
			detailServiceTaxAmountInput =
				t.serviceTaxAmount != null ? String(t.serviceTaxAmount) : '';
			detailAmountEditable = t.allowEdit ?? true;
		} catch (err) {
			console.error('Failed to load pricing for service', err);
			detailAmountEditable = true;
		}
	}

	function buildPendingItem(serviceIdValue: string): Omit<PendingItem, 'id' | 'advisingDoctorName'> | null {
		const serviceId = parseNumberOrNull(serviceIdValue);
		if (!serviceId) {
			toastService.addToast('Service is required.', StatusColorEnum.ERROR);
			return null;
		}
		const serviceAmount = parseDecimalOrNull(detailServiceAmountInput);
		const serviceTaxAmount = parseDecimalOrNull(
			detailServiceTaxAmountInput
		);
		const serviceUnit = parseNumberOrNull(detailServiceUnitInput);
		if (!serviceUnit || serviceUnit < 1) {
			toastService.addToast('Unit must be at least 1.', StatusColorEnum.ERROR);
			return null;
		}

		const item = {
			serviceId,
			advisingDoctorId: detailAdvisingDoctorIdInput.trim() || null,
			serviceAmount,
			serviceTaxAmount,
			serviceUnit,
			instruction: detailInstructionInput.trim() || null,
			isUrgent: detailIsUrgentInput
		};
		return item;
	}

	async function handleAddToList() {
		try {
			const singleServiceId = detailServiceIdInput;
			if (singleServiceId) {
				const built = buildPendingItem(singleServiceId);
				if (!built) return;

				let doctorName: string | null = null;
				if (built.advisingDoctorId) {
					doctorName = await getDoctorLabelForValue(
						built.advisingDoctorId
					);
				}

				// Assign a local incremental id
				const nextId =
					pendingItems.length === 0
						? 1
						: Math.max(...pendingItems.map((p) => p.id)) + 1;
				const newItem: PendingItem = {
					...built,
					id: nextId,
					advisingDoctorName: doctorName
				};

				if (editingDetailId) {
					pendingItems = pendingItems.map((item) =>
						item.id === editingDetailId ? newItem : item
					);
				} else {
					pendingItems = [...pendingItems, newItem];
				}
			} else {
				toastService.addToast(
					'Please choose a service.',
					StatusColorEnum.ERROR
				);
				return;
			}

			resetDetailForm();
			toastService.addToast(
				'Item added to list (not yet saved).',
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Save failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function startEditDetail(row: PendingItem) {
		editingDetailId = row.id;
		detailServiceIdInput = String(row.serviceId ?? '');
		detailAdvisingDoctorIdInput = row.advisingDoctorId ?? '';
		detailServiceAmountInput = row.serviceAmount
			? String(row.serviceAmount)
			: '';
		detailServiceTaxAmountInput = row.serviceTaxAmount
			? String(row.serviceTaxAmount)
			: '';
		detailServiceUnitInput = row.serviceUnit
			? String(row.serviceUnit)
			: '';
		detailInstructionInput = row.instruction ?? '';
		detailIsUrgentInput = Boolean(row.isUrgent);
	}

	async function handleDeleteDetail(row: PendingItem) {
		const result = await dialogService.open({
			title: 'Delete item',
			message: 'Remove this item from the list?',
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		pendingItems = pendingItems.filter((item) => item.id !== row.id);
		toastService.addToast('Item removed from list.', StatusColorEnum.SUCCESS);
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

	const detailColumns: MariTableColumn<PendingItem>[] = [
		{
			id: 'serviceId',
			header: 'No.',
			widthClass: 'w-16',
			filterable: false,
			format: (_value, row, index) => String(index + 1)
		},
		{
			id: 'instruction',
			header: 'Description',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) =>
				(row.instruction as string | null | undefined)?.trim() ||
				`Service ${row.serviceId ?? ''}`
		},
		{
			id: 'serviceAmount',
			header: 'Service Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-20',
			filterable: false,
			format: (value) => (value != null ? String(value) : '–')
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-24',
			filterable: false,
			format: (value) => formatNumber(value as any)
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			widthClass: 'w-20',
			filterable: false,
			format: (_value, row) => (row.isUrgent ? 'Yes' : 'No')
		},
		{
			id: 'advisingDoctorName',
			header: 'Advising Doctor',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) =>
				row.advisingDoctorName && row.advisingDoctorName.trim()
					? row.advisingDoctorName
					: '–'
		},
		{
			id: 'amountDisplay',
			header: 'Amount',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => formatNumber(value as any)
		}
	];

	const historyColumns: MariTableColumn<HistoryItem>[] = [
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => (value ? String(value) : '–')
		},
		...detailColumns
	];

	async function handleSaveOrder() {
		if (!visit || !visit.branchId || !visitId) {
			toastService.addToast(
				'Visit information is missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (pendingItems.length === 0) {
			toastService.addToast(
				'Add at least one item to the list before saving.',
				StatusColorEnum.ERROR
			);
		 return;
		}

		const dateStr = orderDateInput || todayDateString();
		const timeStr = orderTimeInput || new Date().toTimeString().slice(0, 5);

		try {
			// Generate next order number for this visit
			const existingOrders = await getServiceOrder({ visitId });
			const visitKey = visit.visitNo || String(visitId);
			const yearSuffix = dateStr.slice(2, 4);
			const seq = existingOrders.length + 1;
			const orderNo = `${yearSuffix}/${visitKey}/${String(seq).padStart(
				3,
				'0'
			)}`;

			const created = await createServiceOrder({
				branchId: visit.branchId,
				visitId,
				orderDate: dateStr,
				orderTime: timeStr,
				orderNo
			} as any);

			currentOrder = created;

			for (const item of pendingItems) {
				await createServiceOrderDetail({
					serviceOrderId: created.id,
					serviceId: item.serviceId,
					advisingDoctorId: item.advisingDoctorId,
					serviceAmount: item.serviceAmount,
					serviceTaxAmount: item.serviceTaxAmount,
					serviceUnit: item.serviceUnit,
					instruction: item.instruction,
					isUrgent: item.isUrgent
				} as any);
			}

			pendingItems = [];
			resetDetailForm();
			toastService.addToast(
				'Order and items saved.',
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Save failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleShowHistory() {
		if (!visitId) return;
		isLoadingHistory = true;
		showHistory = true;
		try {
			const orders = await getServiceOrder({ visitId });
			const allDetails: HistoryItem[] = [];
			const doctorIdSet = new Set<string>();

			for (const order of orders) {
				const details = await getServiceOrderDetail({
					serviceOrderId: order.id
				});
				for (const d of details) {
					const docId =
						(d.advisingDoctorId as string | null | undefined) ?? null;
					if (docId) doctorIdSet.add(docId);
					allDetails.push({
						...d,
						orderNo: (order.orderNo as string | null | undefined) ?? null,
						advisingDoctorName: null
					});
				}
			}

			// Resolve doctor names for unique IDs
			const doctorIdList = Array.from(doctorIdSet);
			const nameEntries = await Promise.all(
				doctorIdList.map(async (id) => {
					const name = await getDoctorLabelForValue(id);
					return [id, name] as const;
				})
			);
			const doctorNameMap = new Map<string, string>(
				nameEntries.map(([id, name]) => [id, name])
			);

			historyItems = allDetails.map((item) => ({
				...item,
				advisingDoctorName:
					item.advisingDoctorId && doctorNameMap.get(item.advisingDoctorId)
						? doctorNameMap.get(item.advisingDoctorId) ?? null
						: null
			}));
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Load failed') as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isLoadingHistory = false;
		}
	}

	function closeHistory() {
		showHistory = false;
	}

	async function handleDeleteHistoryItem(row: HistoryItem) {
		const result = await dialogService.open({
			title: 'Delete order item',
			message:
				'Delete this item from the order history? This cannot be undone.',
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceOrderDetail({ id: row.id });
			// Refresh history list
			await handleShowHistory();
			toastService.addToast(
				'Order item deleted.',
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<svelte:head>
	<title>EMR Order</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to place orders.'}
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
		<div class="flex flex-col gap-4">
			<DaisyUiCard>
				<DaisyUiCardBody>
					<div class="mb-5 flex flex-col gap-4">
						<div
							class="flex flex-wrap items-center justify-between gap-3"
						>
							<DaisyUiCardBodyTitle className="mb-0">
								Order
							</DaisyUiCardBodyTitle>
							<DaisyUiButton
								className="d-btn-outline d-btn-sm"
								onClick={handleShowHistory}
							>
								Order history
							</DaisyUiButton>
						</div>

						<div class="flex flex-col gap-4 border-b pb-4">
							<!-- Order date & time -->
							<div class="flex flex-wrap items-end gap-4 text-sm">
								<label class="flex flex-col gap-1">
									<span class="font-medium">Order Date</span>
									<input
										type="date"
										class="d-input d-input-sm d-input-bordered w-40"
										bind:value={orderDateInput}
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="font-medium">Order Time</span>
									<input
										type="time"
										class="d-input d-input-sm d-input-bordered w-32"
										bind:value={orderTimeInput}
									/>
								</label>
							</div>

							<!-- Service type radios -->
							<div class="mt-2 flex flex-wrap items-center gap-6 text-sm">
								<div class="font-medium">Service Type</div>
								<div class="flex flex-wrap gap-6">
									<label class="inline-flex items-center gap-2">
										<input
											type="radio"
											name="serviceType"
											class="d-radio d-radio-sm"
											value="all"
											bind:group={serviceFilter}
										/>
										<span>All Services</span>
									</label>
									<label class="inline-flex items-center gap-2">
										<input
											type="radio"
											name="serviceType"
											class="d-radio d-radio-sm"
											value="radiology"
											bind:group={serviceFilter}
										/>
										<span>Radiology</span>
									</label>
									<label class="inline-flex items-center gap-2">
										<input
											type="radio"
											name="serviceType"
											class="d-radio d-radio-sm"
											value="laboratory"
											bind:group={serviceFilter}
										/>
										<span>Laboratory</span>
									</label>
										<label class="inline-flex items-center gap-2">
											<input
												type="radio"
												name="serviceType"
												class="d-radio d-radio-sm"
												value="nursing"
												bind:group={serviceFilter}
											/>
											<span>Nursing</span>
										</label>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Service Name
									<DaisyUiSearchSelect
										bind:value={detailServiceIdInput}
										placeholder="Select service"
										searchFn={searchServices}
										getLabelForValue={getServiceLabelForValue}
										minSearchLength={0}
										onChange={async () => {
											detailServiceAmountInput = '';
											detailServiceTaxAmountInput = '';
											detailServiceUnitInput = '1';
											await applyPricingForSelectedService();
										}}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Order by (Adv Dr.)
									<DaisyUiSearchSelect
										bind:value={detailAdvisingDoctorIdInput}
										placeholder="Select doctor"
										className="w-full"
										searchFn={searchDoctors}
										getLabelForValue={getDoctorLabelForValue}
										minSearchLength={0}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Unit
									<input
										type="number"
										step="1"
										min="1"
										class="d-input-bordered d-input w-full"
										bind:value={detailServiceUnitInput}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Service Amount
									<input
										type="number"
										step="0.01"
										class="d-input-bordered d-input w-full"
										bind:value={detailServiceAmountInput}
										disabled={!detailAmountEditable}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Tax Amount
									<input
										type="number"
										step="0.01"
										class="d-input-bordered d-input w-full"
										bind:value={detailServiceTaxAmountInput}
										disabled
									/>
								</label>
							</div>

							<div class="grid grid-cols-1 gap-4 pt-2 xl:grid-cols-12">
								<label
									class="flex min-w-0 flex-col gap-1 text-sm xl:col-span-7"
								>
									Order Instruction
									<textarea
										class="d-textarea-bordered d-textarea w-full"
										rows="2"
										bind:value={detailInstructionInput}
									></textarea>
								</label>
								<div class="flex items-end xl:col-span-2">
									<label class="flex items-center gap-2 pb-2 text-sm">
										<input
											type="checkbox"
											class="d-checkbox"
											bind:checked={detailIsUrgentInput}
										/>
										<span>Urgent</span>
									</label>
								</div>
								<div class="flex flex-wrap items-end gap-3 xl:col-span-3 xl:justify-end">
									<DaisyUiButton
										className="d-btn-outline d-btn-sm px-6"
										onClick={handleAddToList}
									>
										Add to list
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-primary d-btn-sm px-8"
										onClick={handleSaveOrder}
									>
										Save
									</DaisyUiButton>
									{#if editingDetailId}
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={resetDetailForm}
										>
											Cancel
										</DaisyUiButton>
									{/if}
								</div>
							</div>
					</div>

					<div>
						<h2 class="mb-2 text-base font-semibold">
							Order items (pending list)
						</h2>
						{#if pendingItems.length === 0}
							<p class="text-sm text-base-content/70">
								No items added yet. Use &quot;Add to list&quot; above
								to prepare items before saving the order.
							</p>
						{:else}
							<div
								class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}"
							>
								<MariTable
									rows={pendingItems}
									columns={detailColumns}
									isLoading={false}
									bind:pageSize={detailPageSizeStr}
									bind:currentPage={currentDetailPage}
									showRefreshButton={false}
									emptyMessage="No items."
									showRowActions={true}
									actionsHeader="Actions"
									actionsVariant="none"
									enableColumnFilters={false}
								>
									<svelte:fragment slot="rowActions" let:row>
										<td class="w-28 shrink-0 text-right">
											<div class="flex justify-end gap-1">
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm"
													onClick={() =>
														startEditDetail(row)}
												>
													<LucidePencil
														className="size-4"
													/>
												</DaisyUiButton>
												<DaisyUiButton
													className="d-btn-ghost d-btn-error d-btn-sm"
													onClick={() =>
														handleDeleteDetail(
															row
														)}
												>
													<LucideTrash2
														className="size-4"
													/>
												</DaisyUiButton>
											</div>
										</td>
									</svelte:fragment>
								</MariTable>
							</div>
						{/if}
					</div>
				</DaisyUiCardBody>
			</DaisyUiCard>

			<LNursingEmrOrderHistoryDialog
				open={showHistory}
				onClose={closeHistory}
				items={historyItems}
				isLoading={isLoadingHistory}
				pageSizeStr={detailPageSizeStr}
				onDelete={handleDeleteHistoryItem}
			/>
		</div>
	{/if}
</div>
