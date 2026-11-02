<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type {
		ServiceItemListRow,
		ServiceOrderListRow,
		ServiceTaggingListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LObservationOrderLineDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationOrderLineDeleteDialogContent.svelte';
	import MenziesTable from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import LNursingEmrOrderHistoryTable, {
		type NursingEmrOrderHistoryItem
	} from '$lib/component/own/local/private/medora/nursing-workbench/emr/order/LNursingEmrOrderHistoryTable.svelte';
	import LNursingEmrOrderPendingDialog from '$lib/component/own/local/private/medora/nursing-workbench/emr/order/LNursingEmrOrderPendingDialog.svelte';
	import LServiceOrderPendingLineDialogContent, {
		type ServiceOrderPendingLineFilter,
		type ServiceOrderPendingLineResult
	} from '$lib/component/own/local/private/medora/order/LServiceOrderPendingLineDialogContent.svelte';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { uiLogger } from '$lib/logger';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastInfo, toastSuccess } from '$lib/util/toast-copy.util';
	import { parseMenziesTableEntityStatusId } from '$lib/tool/menzies/menzies-table-entity-status.util';
	import { serviceOrderPendingDetailColumns } from '$lib/tool/order/service-order-pending-detail-columns.util';
	import {
		serviceCatalogLabelsForService,
		serviceCatalogLabelsForServiceId
	} from '$lib/tool/order/service-order-catalog-labels.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(parseUuid(visitIdStr) ?? '');
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	const baseApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/order`
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

	const getPatientVisitById = ({ id }: { id: string }) =>
		apiGet<any>({ mode: 'visit.get', visitId: id });

	const getServiceOrder = ({ visitId }: { visitId: string }) =>
		apiGet<any[]>({ mode: 'serviceOrder.list', visitId });

	const createServiceOrder = (payload: any) =>
		apiPost<any>({ mode: 'serviceOrder.create', payload });

	const getServiceOrderDetail = ({
		visitId: vid,
		serviceOrderIds,
		statusId
	}: {
		visitId: string;
		serviceOrderIds: number[];
		statusId: number;
	}) => {
		const qs = new URLSearchParams({
			mode: 'orderLine.list',
			visitId: String(vid),
			statusId: String(statusId)
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

	const getCategoryList = () => apiGet<any[]>({ mode: 'category.list' });

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
		doctorId: string | null;
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
		subCategoryName: string;
		categoryName: string;
		advisingDoctorId: string | null;
		advisingDoctorName: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
		serviceUnit: number;
		instruction: string | null;
		isUrgent: boolean;
	};

	type HistoryItem = NursingEmrOrderHistoryItem;

	let pendingItems = $state<PendingItem[]>([]);
	let branchServices = $state<ServiceItemListRow[]>([]);
	let branchTaggings = $state<ServiceTaggingListRow[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingHistory = $state(false);

	let currentDetailPage = $state(1);
	let currentHistoryPage = $state(1);
	let detailPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let historyPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);

	/** Maps `service_item.sub_category_id` → `sub_category.category_id` (Radiology=1, Nursing=2, Laboratory=5). */
	let subCategoryIdToCategoryId = $state<Map<number, number>>(
		new Map()
	);
	let subCategoryNameById = $state<Map<number, string>>(new Map());
	let categoryNameById = $state<Map<number, string>>(new Map());
	let serviceFilterSubCategoryPromise: Promise<void> | null = null;

	let lastLoadedVisitId = $state<number | null>(null);

	let historyItems = $state<HistoryItem[]>([]);
	let historyTableFilters = $state<Record<string, string>>({});
	let showPendingOrderDialog = $state(false);
	let isSavingOrder = $state(false);

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
					visitNo: v.visitNo ?? null,
					doctorId:
						(v.doctorId as string | null | undefined)?.trim() ||
						null
				};
				await fetchBranchServices(v.hospitalId, v.branchId);
				pendingItems = [];
				void loadOrderHistory();
			} else {
				visit = null;
				branchServices = [];
				branchTaggings = [];
				currentOrder = null;
				pendingItems = [];
				historyItems = [];
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
			const [all, categories] = await Promise.all([
				getSubCategory({}),
				getCategoryList()
			]);
			const map = new Map<number, number>();
			const subNames = new Map<number, string>();
			for (const s of all) {
				const id = Number(s.id);
				map.set(id, Number(s.categoryId));
				subNames.set(
					id,
					(s.subCategoryName ?? '').trim() || '–'
				);
			}
			subCategoryIdToCategoryId = map;
			subCategoryNameById = subNames;
			categoryNameById = new Map(
				categories.map((c) => [
					Number(c.id),
					(c.categoryName ?? '').trim() || '–'
				])
			);
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

	async function searchServicesForDialog(
		query: string,
		ctx: {
			orderDate: string;
			serviceFilter: ServiceOrderPendingLineFilter;
		}
	): Promise<{ label: string; value: string }[]> {
		await ensureServiceFilterSubCategoryIdsLoaded();
		const effectiveServiceIds = effectiveServiceIdsForOrderDate(
			ctx.orderDate || todayDateString()
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
					serviceMatchesFilter(service, ctx.serviceFilter)
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
		filter: ServiceOrderPendingLineFilter
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

	async function loadPricingForDialog(
		serviceId: string,
		orderDate: string
	): Promise<{
		serviceAmount: string;
		serviceTaxAmount: string;
		amountEditable: boolean;
	}> {
		const empty = {
			serviceAmount: '',
			serviceTaxAmount: '',
			amountEditable: true
		};
		const branchIdForVisit = visit?.branchId;
		if (!branchIdForVisit) return empty;
		const sid = parseNumberOrNull(serviceId);
		if (!sid) return empty;
		try {
			const taggings = await getServiceTagging({
				branchId: branchIdForVisit,
				serviceId: sid
			});
			const t = pickEffectiveTagging(taggings, orderDate);
			if (!t) return empty;
			return {
				serviceAmount:
					t.serviceAmount != null ? String(t.serviceAmount) : '',
				serviceTaxAmount:
					t.serviceTaxAmount != null
						? String(t.serviceTaxAmount)
						: '',
				amountEditable: t.allowEdit ?? true
			};
		} catch (err) {
			uiLogger.error(
				'Failed to load pricing for service',
				err instanceof Error ? err : undefined
			);
			return empty;
		}
	}

	async function openPendingLineDialog(editRow?: PendingItem) {
		const result = await dialogService.open({
			title: editRow
				? msg.cpoe_order_edit_item_title()
				: msg.cpoe_order_add_item_title(),
			modalClassName: 'max-w-4xl',
			component: LServiceOrderPendingLineDialogContent,
			props: {
				orderDate: orderDateInput,
				orderTime: orderTimeInput,
				isEdit: Boolean(editRow),
				initial: editRow
					? {
							serviceId: String(editRow.serviceId),
							advisingDoctorId: editRow.advisingDoctorId ?? '',
							serviceAmount: editRow.serviceAmount ?? '',
							serviceTaxAmount: editRow.serviceTaxAmount ?? '',
							serviceUnit: String(editRow.serviceUnit),
							instruction: editRow.instruction ?? '',
							isUrgent: editRow.isUrgent
						}
					: null,
				searchServices: (
					query: string,
					ctx: {
						orderDate: string;
						serviceFilter: ServiceOrderPendingLineFilter;
					}
				) => searchServicesForDialog(query, ctx),
				getServiceLabelForValue,
				searchDoctors,
				getDoctorLabelForValue,
				loadPricing: loadPricingForDialog,
				defaultAdvisingDoctorId: visit?.doctorId ?? ''
			}
		});
		if (!result.confirmed || !result.data) return;
		const data = result.data as ServiceOrderPendingLineResult;
		orderDateInput = data.orderDate;
		orderTimeInput = data.orderTime;

		try {
			const serviceId = parseNumberOrNull(data.serviceId);
			if (!serviceId) {
				toastService.addToast(
					'Service is required.',
					StatusColorEnum.ERROR
				);
				return;
			}
			const serviceUnit = parseNumberOrNull(data.serviceUnit);
			if (!serviceUnit || serviceUnit < 1) {
				toastService.addToast(
					'Unit must be at least 1.',
					StatusColorEnum.ERROR
				);
				return;
			}
			const serviceAmount = parseDecimalOrNull(data.serviceAmount);
			const serviceTaxAmount = parseDecimalOrNull(
				data.serviceTaxAmount
			);
			const nextId =
				pendingItems.length === 0
					? 1
					: Math.max(...pendingItems.map((p) => p.id)) + 1;
			const catalogLabels = serviceCatalogLabelsForServiceId(
				serviceId,
				branchServices,
				subCategoryNameById,
				subCategoryIdToCategoryId,
				categoryNameById
			);
			const newItem: PendingItem = {
				id: editRow?.id ?? nextId,
				serviceId,
				serviceName: data.serviceName,
				subCategoryName: catalogLabels.subCategoryName,
				categoryName: catalogLabels.categoryName,
				advisingDoctorId: data.advisingDoctorId.trim() || null,
				advisingDoctorName: data.advisingDoctorName,
				serviceAmount,
				serviceTaxAmount,
				serviceUnit,
				instruction: data.instruction.trim() || null,
				isUrgent: data.isUrgent
			};
			if (editRow) {
				pendingItems = pendingItems.map((item) =>
					item.id === editRow.id ? newItem : item
				);
			} else {
				pendingItems = [...pendingItems, newItem];
			}
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

	const detailColumns = serviceOrderPendingDetailColumns<PendingItem>();

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

		isSavingOrder = true;
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
			showPendingOrderDialog = false;
			await loadOrderHistory();
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
		} finally {
			isSavingOrder = false;
		}
	}

	function openPendingOrderDialog() {
		orderDateInput = todayDateString();
		orderTimeInput = new Date().toTimeString().slice(0, 5);
		currentDetailPage = 1;
		showPendingOrderDialog = true;
	}

	function closePendingOrderDialog() {
		if (isSavingOrder) return;
		showPendingOrderDialog = false;
	}

	function handleHistoryFiltersChange(filters: Record<string, string>) {
		historyTableFilters = filters;
		currentHistoryPage = 1;
		void loadOrderHistory();
	}

	async function loadOrderHistory() {
		if (!visitId || !hospitalId) return;
		isLoadingHistory = true;
		try {
			await ensureServiceFilterSubCategoryIdsLoaded();
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

			const statusId =
				parseMenziesTableEntityStatusId(historyTableFilters) ??
				StatusEnum.ACTIVE;

			const details = await getServiceOrderDetail({
				visitId,
				serviceOrderIds: orderIds,
				statusId
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

			const resolvedServiceRows = await Promise.all(
				serviceIdList.map((id) => getServiceItem({ id }))
			);
			const serviceSubCategoryNameMap = new Map<number, string>();
			const serviceCategoryNameMap = new Map<number, string>();
			serviceIdList.forEach((id, i) => {
				const svc = resolvedServiceRows[i]?.[0];
				const labels = serviceCatalogLabelsForService(
					svc,
					subCategoryNameById,
					subCategoryIdToCategoryId,
					categoryNameById
				);
				serviceSubCategoryNameMap.set(id, labels.subCategoryName);
				serviceCategoryNameMap.set(id, labels.categoryName);
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
					: '–',
				categoryName: d.serviceId
					? (serviceCategoryNameMap.get(d.serviceId) ?? '–')
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
			await loadOrderHistory();
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
		<WashAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the 'Choose Visit' button above to place orders."
			className="z-0"
		/>
	{:else}
		<div class="flex flex-col gap-4">
			{#if !visit && !isLoadingVisit}
				<WashAlert
					type={StatusColorEnum.WARNING}
					message="Visit not found."
				/>
			{:else if !visit}
				<div
					class={TableEnum.HEIGHT}
				>
					<MenziesTable
						title="Order"
						rows={[]}
						columns={detailColumns}
						isLoading={true}
						bind:pageSize={detailPageSizeStr}
						bind:currentPage={currentDetailPage}
						totalRowCount={0}
						emptyMessage="Loading…"
						showRowActions={false}
						enableColumnFilters={false}
						on:refresh={() => {
							if (visitId) void fetchVisit();
						}}
					/>
				</div>
			{:else}
				<LNursingEmrOrderHistoryTable
					items={historyItems}
					isLoading={isLoadingHistory || isLoadingVisit}
					bind:pageSizeStr={historyPageSizeStr}
					bind:currentPage={currentHistoryPage}
					bind:columnFilters={historyTableFilters}
					onFiltersChange={handleHistoryFiltersChange}
					onDelete={handleDeleteHistoryItem}
					onAdd={openPendingOrderDialog}
					addLabel={msg.cpoe_order_add_to_list()}
					onRefresh={() => loadOrderHistory()}
				/>

				<LNursingEmrOrderPendingDialog
					open={showPendingOrderDialog}
					onClose={closePendingOrderDialog}
					onSave={handleSaveOrder}
					isSaving={isSavingOrder}
					description={msg.cpoe_order_pending_empty()}
				>
					{#snippet table()}
						<div class="flex min-h-0 flex-1 flex-col">
							<MenziesTable
								rows={pendingItems}
								columns={detailColumns}
								isLoading={false}
								bind:pageSize={detailPageSizeStr}
								bind:currentPage={currentDetailPage}
								emptyMessage="No items."
								showRowActions={true}
								actionsHeader="Actions"
								actionsVariant="none"
								enableColumnFilters={false}
								showAddButton={true}
								addLabel={msg.cpoe_order_add_to_list()}
								onAdd={openPendingLineDialog}
								fillParent={true}
								on:refresh={async () => {
									if (visit) {
										await fetchBranchServices(
											visit.hospitalId,
											visit.branchId
										);
									}
								}}
							>
							{#snippet rowActions(row, rowIndex)}
								<MenziesTableEditDeleteActions
									onEdit={() =>
										openPendingLineDialog(row as PendingItem)}
									onDelete={() =>
										handleDeleteDetail(row as PendingItem)}
								/>
							{/snippet}
							</MenziesTable>
						</div>
					{/snippet}
				</LNursingEmrOrderPendingDialog>
			{/if}
		</div>
	{/if}
</div>
