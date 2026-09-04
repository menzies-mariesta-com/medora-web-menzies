<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import MariTableEditDeleteActions from '$lib/component/own/library/mari/table/MariTableEditDeleteActions.svelte';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type {
		ServiceItemListRow,
		ServiceOrderDetailListRow,
		ServiceOrderListRow,
		ServiceTaggingListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import type { StaffWithRelations } from '$lib/model/type/heka/staff.type';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LObservationOrderLineDeleteDialogContent from '$lib/component/own/local/private/heka/observation/LObservationOrderLineDeleteDialogContent.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import LNursingEmrOrderHistoryDialog from '$lib/component/own/local/private/heka/nursing-workbench/emr/order/LNursingEmrOrderHistoryDialog.svelte';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import { uiLogger } from '$lib/logger';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastInfo, toastSuccess } from '$lib/util/toast-copy.util';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	const baseApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/order`
			: ''
	);

	async function apiGet<T>(
		params: Record<string, string | number | undefined>
	): Promise<T> {
		const qs = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v == null || v === '') continue;
			qs.set(k, String(v));
		}
		const res = await fetch(`${baseApi}?${qs.toString()}`);
		if (!res.ok)
			throw new Error(await readFailedResponseMessage(res));
		return (await res.json()) as T;
	}

	async function readFailedResponseMessage(
		res: Response
	): Promise<string> {
		const text = await res.text();
		try {
			const j = text
				? (JSON.parse(text) as { message?: string })
				: null;
			if (j?.message && String(j.message).trim()) {
				return String(j.message).trim();
			}
		} catch {
			// ignore JSON parse
		}
		const t = text?.trim();
		if (t) return t;
		return `Request failed (${res.status})`;
	}

	async function apiPost<T>(body: any): Promise<T> {
		const res = await fetch(baseApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok)
			throw new Error(await readFailedResponseMessage(res));
		return (await res.json()) as T;
	}

	const getPatientVisitById = ({ id }: { id: number }) =>
		apiGet<any>({ mode: 'visit.get', visitId: id });

	const getServiceOrder = ({ visitId }: { visitId: number }) =>
		apiGet<any[]>({ mode: 'serviceOrder.list', visitId });

	const createServiceOrder = (payload: any) =>
		apiPost<any>({ mode: 'serviceOrder.create', payload });

	const getServiceOrderDetail = ({
		visitId: vid,
		serviceOrderIds
	}: {
		visitId: number;
		serviceOrderIds: number[];
	}) => {
		const qs = new URLSearchParams({
			mode: 'orderLine.list',
			visitId: String(vid)
		});
		for (const id of serviceOrderIds)
			qs.append('serviceOrderIds', String(id));
		return fetch(`${baseApi}?${qs.toString()}`).then(async (r) => {
			if (!r.ok) throw new Error(await readFailedResponseMessage(r));
			return (await r.json()) as any[];
		});
	};

	const createServiceOrderDetail = (payload: any) =>
		apiPost<any>({ mode: 'orderLine.create', payload });
	const updateServiceOrderDetail = (payload: any) =>
		apiPost<any>({ mode: 'orderLine.update', payload });
	const deleteServiceOrderDetail = ({
		id,
		cancelRemark
	}: {
		id: number;
		cancelRemark?: string;
	}) =>
		apiPost<{ ok: true }>({
			mode: 'orderLine.delete',
			id,
			cancelRemark: cancelRemark ?? ''
		});

	const getServiceTagging = ({
		branchId,
		serviceId
	}: {
		branchId: string;
		serviceId?: number;
	}) =>
		apiGet<any[]>({
			mode: 'serviceTagging.list',
			branchId,
			serviceId
		});

	const getServiceItemPaginated = ({
		hospitalId: _hid,
		serviceName,
		statusId,
		page,
		pageSize
	}: any) =>
		apiGet<any>({
			mode: 'serviceItem.paginated',
			serviceName,
			statusId,
			page,
			pageSize
		});

	const getServiceItem = ({ id }: { id: number }) =>
		apiGet<ServiceItemListRow | null>({
			mode: 'serviceItem.byId',
			id
		}).then((row) => (row ? [row] : []));

	/** Non-deleted items for the hospital (from route); used with branch service tagging. */
	const getServiceItemsForHospital = () =>
		apiGet<{ data: ServiceItemListRow[] }>({
			mode: 'serviceItem.paginated',
			page: 1,
			pageSize: 10000
		}).then((r) => r.data);

	const getSubCategory = (_input: any) =>
		apiGet<any[]>({ mode: 'subCategory.list' });

	const getDoctorStaffPaginated = ({
		search,
		hospitalId: _hid,
		page,
		pageSize
	}: any) =>
		apiGet<any>({ mode: 'doctor.search', search, page, pageSize });

	const getStaffByIdWithRelations = ({ id }: { id: string }) =>
		apiGet<any>({ mode: 'staff.get', id });
	const getStaffByIdWithRelationsBatched = (id: string) =>
		getStaffByIdWithRelations({ id });

	let visit = $state<{
		patientId: string;
		hospitalId: string;
		branchId: string;
		visitNo: string | null;
	} | null>(null);

	let currentOrder = $state<ServiceOrderListRow | null>(null);
	let orderDateInput = $state(todayDateString());
	let orderTimeInput = $state(
		new Date().toTimeString().slice(0, 5) // HH:MM
	);

	type PendingItem = {
		id: number;
		serviceId: number;
		serviceName: string;
		advisingDoctorId: string | null;
		advisingDoctorName: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
		serviceUnit: number;
		instruction: string | null;
		isUrgent: boolean;
	};

	type HistoryItem = ServiceOrderDetailListRow & {
		orderNo: string | null;
		advisingDoctorName: string | null;
		serviceName: string;
		subCategoryName: string;
	};

	let pendingItems = $state<PendingItem[]>([]);
	let branchServices = $state<ServiceItemListRow[]>([]);
	let branchTaggings = $state<ServiceTaggingListRow[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingHistory = $state(false);

	let currentDetailPage = $state(1);
	let detailPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	const detailPageSizeNum = $derived(Number(detailPageSizeStr) || 10);
	const pagedPendingItems = $derived(
		pendingItems.slice(
			(currentDetailPage - 1) * detailPageSizeNum,
			currentDetailPage * detailPageSizeNum
		)
	);

	let serviceFilter = $state<
		'all' | 'radiology' | 'laboratory' | 'nursing'
	>('all');
	type ServiceFilterType =
		| 'all'
		| 'radiology'
		| 'laboratory'
		| 'nursing';
	/** Maps `service_item.sub_category_id` → `sub_category.category_id` (Radiology=1, Nursing=2, Laboratory=5). */
	let subCategoryIdToCategoryId = $state<Map<number, number>>(
		new Map()
	);
	let serviceFilterSubCategoryPromise: Promise<void> | null = null;

	let detailServiceIdInput = $state('');
	let detailAdvisingDoctorIdInput = $state('');
	let detailServiceAmountInput = $state('');
	let detailServiceTaxAmountInput = $state('');
	let detailServiceUnitInput = $state('1');
	let detailInstructionInput = $state('');
	let detailIsUrgentInput = $state(false);
	let editingDetailId = $state<number | null>(null);
	let detailAmountEditable = $state(true);
	let lastLoadedVisitId = $state<number | null>(null);

	let historyItems = $state<HistoryItem[]>([]);
	let showHistory = $state(false);

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

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
			await ensureServiceFilterSubCategoryIdsLoaded();
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
				branchTaggings = [];
				currentOrder = null;
				pendingItems = [];
			}
		} finally {
			isLoadingVisit = false;
		}
	}

	async function ensureServiceFilterSubCategoryIdsLoaded() {
		if (serviceFilterSubCategoryPromise) {
			await serviceFilterSubCategoryPromise;
			return;
		}
		serviceFilterSubCategoryPromise = (async () => {
			const all = await getSubCategory({});
			const map = new Map<number, number>();
			for (const s of all) {
				map.set(Number(s.id), Number(s.categoryId));
			}
			subCategoryIdToCategoryId = map;
		})();
		await serviceFilterSubCategoryPromise;
	}

	let mounted = $state(false);

	lifeCycleUtil.onMount(() => {
		mounted = true;
		if (visitId) fetchVisit();
	});

	$effect(() => {
		if (!mounted) return;

		if (visitId !== lastLoadedVisitId) {
			lastLoadedVisitId = visitId;
			if (visitId) {
				fetchVisit();
			} else {
				visit = null;
				currentOrder = null;
				pendingItems = [];
			}
		}
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
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
			const [taggings, allServices] = await Promise.all([
				getServiceTagging({ branchId: branchIdForVisit }),
				getServiceItemsForHospital()
			]);
			branchTaggings = taggings;
			const serviceIds = new Set(
				taggings.map((t) => t.serviceId).filter((id) => id != null)
			);
			if (serviceIds.size === 0) {
				branchServices = [];
				branchTaggings = [];
				return;
			}
			branchServices = allServices.filter((s) =>
				serviceIds.has(s.id)
			);
		} catch (err) {
			uiLogger.error(
				'Failed to load branch services',
				err instanceof Error ? err : undefined
			);
			branchServices = [];
			branchTaggings = [];
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
		return res.data.map((staff: StaffWithRelations) => ({
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
		await ensureServiceFilterSubCategoryIdsLoaded();
		const effectiveServiceIds = effectiveServiceIdsForOrderDate(
			orderDateInput || todayDateString()
		);
		const res = await getServiceItemPaginated({
			hospitalId,
			serviceName: query.trim(),
			statusId: StatusEnum.ACTIVE,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		return res.data
			.filter(
				(service: ServiceItemListRow) =>
					effectiveServiceIds.has(service.id) &&
					serviceMatchesFilter(service, serviceFilter)
			)
			.map((service: ServiceItemListRow) => ({
				label: StringUtil.serviceOptionDisplayName(service),
				value: String(service.id)
			}));
	}

	async function getServiceLabelForValue(
		id: string
	): Promise<string> {
		const serviceId = Number(id);
		const cachedService = branchServices.find(
			(s) => s.id === serviceId
		);
		if (cachedService) {
			return `${cachedService.serviceName ?? `Service ${cachedService.id}`}${cachedService.serviceCode ? ` - ${cachedService.serviceCode}` : ''}`;
		}
		const fetchedService = await getServiceItem({ id: serviceId });
		const service = fetchedService[0];
		if (!service) return '';
		return `${service.serviceName ?? `Service ${service.id}`}${service.serviceCode ? ` - ${service.serviceCode}` : ''}`;
	}

	function parseNumberOrNull(
		value: string | number | null | undefined
	): number | null {
		if (value == null) return null;
		const trimmed =
			typeof value === 'string' ? value.trim() : String(value).trim();
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

	function toDateOnly(value: unknown): string | null {
		if (value == null) return null;
		const str = String(value).trim();
		if (!str) return null;
		return str.length >= 10 ? str.slice(0, 10) : null;
	}

	function pickEffectiveTagging(
		taggings: ServiceTaggingListRow[],
		orderDate: string
	): ServiceTaggingListRow | null {
		const normalizedOrderDate =
			toDateOnly(orderDate) ?? todayDateString();
		const dated: Array<{
			tagging: ServiceTaggingListRow;
			date: string;
		}> = [];
		const undated: ServiceTaggingListRow[] = [];

		for (const tagging of taggings) {
			const validDate = toDateOnly(tagging.validDate);
			if (!validDate) {
				undated.push(tagging);
				continue;
			}
			if (validDate <= normalizedOrderDate) {
				dated.push({ tagging, date: validDate });
			}
		}

		if (dated.length > 0) {
			dated.sort((a, b) => {
				if (a.date === b.date) return b.tagging.id - a.tagging.id;
				return b.date.localeCompare(a.date);
			});
			return dated[0].tagging;
		}

		if (undated.length > 0) {
			undated.sort((a, b) => b.id - a.id);
			return undated[0];
		}

		return null;
	}

	function effectiveServiceIdsForOrderDate(
		orderDate: string
	): Set<number> {
		const taggingsByService = new Map<
			number,
			ServiceTaggingListRow[]
		>();
		for (const tagging of branchTaggings) {
			if (tagging.serviceId == null) continue;
			const existing = taggingsByService.get(tagging.serviceId);
			if (existing) {
				existing.push(tagging);
			} else {
				taggingsByService.set(tagging.serviceId, [tagging]);
			}
		}

		const effectiveIds = new Set<number>();
		for (const [serviceId, serviceTaggings] of taggingsByService) {
			if (pickEffectiveTagging(serviceTaggings, orderDate)) {
				effectiveIds.add(serviceId);
			}
		}
		return effectiveIds;
	}

	function serviceMatchesFilter(
		service: ServiceItemListRow,
		filter: ServiceFilterType
	): boolean {
		if (filter === 'all') return true;
		const subCategoryId = Number(service.subCategoryId);
		if (!Number.isFinite(subCategoryId)) return false;
		const catId = subCategoryIdToCategoryId.get(subCategoryId);
		if (catId === undefined) return false;
		if (filter === 'radiology') {
			return catId === CategoryEnum.RADIOLOGY;
		}
		if (filter === 'laboratory') {
			return catId === CategoryEnum.LABORATORY;
		}
		if (filter === 'nursing') {
			return catId === CategoryEnum.NURSING_PROCEDURE;
		}
		return true;
	}

	const filteredBranchServices = $derived(
		branchServices.filter((s) =>
			serviceMatchesFilter(s, serviceFilter)
		)
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
			const t = pickEffectiveTagging(taggings, orderDateInput);
			if (!t) {
				detailServiceAmountInput = '';
				detailServiceTaxAmountInput = '';
				detailAmountEditable = true;
				return;
			}
			detailServiceAmountInput =
				t.serviceAmount != null ? String(t.serviceAmount) : '';
			detailServiceTaxAmountInput =
				t.serviceTaxAmount != null ? String(t.serviceTaxAmount) : '';
			detailAmountEditable = t.allowEdit ?? true;
		} catch (err) {
			uiLogger.error(
				'Failed to load pricing for service',
				err instanceof Error ? err : undefined
			);
			detailAmountEditable = true;
		}
	}

	function buildPendingItem(
		serviceIdValue: string
	): Omit<
		PendingItem,
		'id' | 'advisingDoctorName' | 'serviceName'
	> | null {
		const serviceId = parseNumberOrNull(serviceIdValue);
		if (!serviceId) {
			toastService.addToast(
				'Service is required.',
				StatusColorEnum.ERROR
			);
			return null;
		}
		const serviceAmount = parseDecimalOrNull(
			detailServiceAmountInput
		);
		const serviceTaxAmount = parseDecimalOrNull(
			detailServiceTaxAmountInput
		);
		const serviceUnit = parseNumberOrNull(detailServiceUnitInput);
		if (!serviceUnit || serviceUnit < 1) {
			toastService.addToast(
				'Unit must be at least 1.',
				StatusColorEnum.ERROR
			);
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

				let serviceName =
					await getServiceLabelForValue(singleServiceId);

				// Assign a local incremental id
				const nextId =
					pendingItems.length === 0
						? 1
						: Math.max(...pendingItems.map((p) => p.id)) + 1;
				const newItem: PendingItem = {
					...built,
					id: nextId,
					advisingDoctorName: doctorName,
					serviceName
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
			toastInfo(
				toastService,
				m.entity_order_draft_line(),
				m.toast_action_created(),
				'Not saved yet.'
			);
		} catch (err) {
			toastService.addErrorToast(
				'Could not add this item to the order list',
				err
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
		toastSuccess(
			toastService,
			m.entity_order_draft_line(),
			m.toast_action_removed()
		);
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
			id: 'serviceName',
			header: 'Service Name',
			widthClass: 'w-64',
			filterable: false,
			format: (_value, row) => row.serviceName || '–'
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
			format: (value) => formatNumberDisplay(value as any)
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
			format: (value) => formatNumberDisplay(value as any)
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
			format: (value) => formatNumberDisplay(value as any)
		}
	];

	const historyColumns: MariTableColumn<HistoryItem>[] = [
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		},
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (value) => (value ? String(value) : '–')
		},
		...(detailColumns as any[])
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

		const today = todayDateString();
		const dateStr = toDateOnly(orderDateInput || today) ?? today;
		if (dateStr < today) {
			toastService.addToast(
				'Order date cannot be in the past.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const timeStr =
			orderTimeInput || new Date().toTimeString().slice(0, 5);
		const lineCount = pendingItems.length;

		try {
			const created = await createServiceOrder({
				branchId: visit.branchId,
				visitId,
				orderDate: dateStr,
				orderTime: timeStr
			} as any);

			currentOrder = created;

			await Promise.all(
				pendingItems.map((item) =>
					createServiceOrderDetail({
						serviceOrderId: created.id,
						serviceId: item.serviceId,
						advisingDoctorId: item.advisingDoctorId,
						serviceAmount: item.serviceAmount,
						serviceTaxAmount: item.serviceTaxAmount,
						serviceUnit: item.serviceUnit,
						instruction: item.instruction,
						isUrgent: item.isUrgent
					} as any)
				)
			);

			pendingItems = [];
			resetDetailForm();
			toastSuccess(
				toastService,
				m.entity_medication_order(),
				m.toast_action_saved(),
				String(lineCount)
			);
		} catch (err) {
			toastService.addErrorToast(
				'Could not save service order and line items',
				err
			);
		}
	}

	async function handleShowHistory() {
		if (!visitId || !hospitalId) return;
		isLoadingHistory = true;
		showHistory = true;
		try {
			const orders = await getServiceOrder({ visitId });
			if (orders.length === 0) {
				historyItems = [];
				return;
			}

			const orderIds = orders.map((o) => o.id);
			const orderNoMap = new Map(
				orders.map((o) => [
					o.id,
					(o.orderNo as string | null | undefined) ?? null
				])
			);

			const details = await getServiceOrderDetail({
				visitId,
				serviceOrderIds: orderIds
			});

			const doctorIdSet = new Set<string>();
			for (const d of details) {
				const docId =
					(d.advisingDoctorId as string | null | undefined) ?? null;
				if (docId) doctorIdSet.add(docId);
			}

			const doctorIdList = Array.from(doctorIdSet);
			const resolvedStaff = await Promise.all(
				doctorIdList.map((id) => getStaffByIdWithRelationsBatched(id))
			);
			const doctorNameMap = new Map<string, string>();
			doctorIdList.forEach((id, i) => {
				const staff = resolvedStaff[i];
				if (staff)
					doctorNameMap.set(
						id,
						StringUtil.doctorOptionDisplayName(staff)
					);
			});

			const serviceIdSet = new Set<number>();
			for (const d of details) {
				if (d.serviceId) serviceIdSet.add(d.serviceId);
			}
			const serviceIdList = Array.from(serviceIdSet);
			const resolvedServices = await Promise.all(
				serviceIdList.map((id) => getServiceLabelForValue(String(id)))
			);
			const serviceNameMap = new Map<number, string>();
			serviceIdList.forEach((id, i) => {
				serviceNameMap.set(id, resolvedServices[i]);
			});

			const allSubCats = await getSubCategory({});
			const subCatNameById = new Map(
				allSubCats.map((s) => [
					Number(s.id),
					(s.subCategoryName ?? '').trim() || '–'
				])
			);

			const resolvedServiceRows = await Promise.all(
				serviceIdList.map((id) => getServiceItem({ id }))
			);
			const serviceSubCategoryNameMap = new Map<number, string>();
			serviceIdList.forEach((id, i) => {
				const rows = resolvedServiceRows[i];
				const svc = rows?.[0];
				if (!svc) {
					serviceSubCategoryNameMap.set(id, '–');
					return;
				}
				const nm = subCatNameById.get(Number(svc.subCategoryId));
				serviceSubCategoryNameMap.set(id, nm ?? '–');
			});

			historyItems = details.map((d) => ({
				...d,
				orderNo: orderNoMap.get(d.serviceOrderId) ?? null,
				advisingDoctorName:
					d.advisingDoctorId && doctorNameMap.get(d.advisingDoctorId)
						? (doctorNameMap.get(d.advisingDoctorId) ?? null)
						: null,
				serviceName: d.serviceId
					? (serviceNameMap.get(d.serviceId) ?? '')
					: '',
				subCategoryName: d.serviceId
					? (serviceSubCategoryNameMap.get(d.serviceId) ?? '–')
					: '–'
			}));
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Load failed') as string,
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
		if (row.lockedByClosedOpBill) {
			toastService.addToast(
				m.observation_emr_order_line_locked_op_bill(),
				StatusColorEnum.WARNING
			);
			return;
		}
		const result = await dialogService.open<{ cancelRemark?: string }>({
			title: m.observation_emr_order_line_inactivate_title(),
			component: LObservationOrderLineDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceOrderDetail({
				id: row.id,
				cancelRemark: result.data?.cancelRemark ?? ''
			});
			await handleShowHistory();
			toastSuccess(
				toastService,
				m.entity_order_item(),
				m.toast_action_inactivated()
			);
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_inactivate_failed()) as string,
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
			message="Choose a visit using the 'Choose Visit' button above to place orders."
			className="z-0"
		/>
	{:else}
		<div class="flex flex-col gap-4">
			{#if !visit && !isLoadingVisit}
				<DaisyUiAlert
					type={StatusColorEnum.WARNING}
					message="Visit not found."
				/>
			{:else if !visit}
				<DaisyUiCard>
					<DaisyUiCardBody>
						<DaisyUiCardBodyTitle className="mb-0"
							>Order</DaisyUiCardBodyTitle
						>
						<div class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}">
							<MariTable
								rows={[]}
								columns={detailColumns}
								isLoading={true}
								bind:pageSize={detailPageSizeStr}
								bind:currentPage={currentDetailPage}
								totalRowCount={0}
								showRefreshButton={false}
								emptyMessage="Loading…"
								showRowActions={false}
								enableColumnFilters={false}
								useRemoteFilters={false}
							/>
						</div>
					</DaisyUiCardBody>
				</DaisyUiCard>
			{:else}
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
										<DaisyUiInputField
											bind:value={orderDateInput}
											inputType="date"
											min={todayDateString()}
											className="d-input-sm w-40"
										/>
									</label>
									<label class="flex flex-col gap-1">
										<span class="font-medium">Order Time</span>
										<input
											type="time"
											class="d-input-bordered d-input d-input-sm w-32"
											bind:value={orderTimeInput}
										/>
									</label>
								</div>

								<!-- Service type radios -->
								<div
									class="mt-2 flex flex-wrap items-center gap-6 text-sm"
								>
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

							<div
								class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
							>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									Service Name
									<DaisyUiSearchSelect
										bind:value={detailServiceIdInput}
										placeholder="Select service"
										searchFn={searchServices}
										getLabelForValue={getServiceLabelForValue}
										invalidateKey={serviceFilter}
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

							<div
								class="grid grid-cols-1 gap-4 pt-2 xl:grid-cols-12"
							>
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
								<div
									class="flex flex-wrap items-end gap-3 xl:col-span-3 xl:justify-end"
								>
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
									No items added yet. Use &quot;Add to list&quot;
									above to prepare items before saving the order.
								</p>
							{:else}
								<div
									class="flex flex-col gap-3 {TableEnum.HEIGHT_SMALL}"
								>
									<MariTable
										rows={pagedPendingItems}
										columns={detailColumns}
										isLoading={false}
										bind:pageSize={detailPageSizeStr}
										bind:currentPage={currentDetailPage}
										totalRowCount={pendingItems.length}
										showRefreshButton={false}
										emptyMessage="No items."
										showRowActions={true}
										actionsHeader="Actions"
										actionsVariant="none"
										enableColumnFilters={false}
										useRemoteFilters={true}
									>
										{#snippet rowActions(row, rowIndex)}
											<MariTableEditDeleteActions
												onEdit={() =>
													startEditDetail(row as PendingItem)}
												onDelete={() =>
													handleDeleteDetail(row as PendingItem)}
											/>
										{/snippet}
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
			{/if}
		</div>
	{/if}
</div>
