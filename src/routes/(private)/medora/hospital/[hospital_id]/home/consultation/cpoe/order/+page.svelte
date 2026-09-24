<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import {
		formatNumberDisplay,
		type NumberDisplayInput
	} from '$lib/util/number-display.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type {
		ServiceItemListRow,
		ServiceOrderDetailListRow,
		ServiceOrderListRow,
		ServiceTaggingListRow,
		SubCategoryListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LObservationOrderLineDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationOrderLineDeleteDialogContent.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import LNursingEmrOrderHistoryDialog from '$lib/component/own/local/private/medora/nursing-workbench/emr/order/LNursingEmrOrderHistoryDialog.svelte';
	import LServiceOrderPendingLineDialogContent, {
		type ServiceOrderPendingLineFilter,
		type ServiceOrderPendingLineResult
	} from '$lib/component/own/local/private/medora/order/LServiceOrderPendingLineDialogContent.svelte';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { uiLogger } from '$lib/logger';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastInfo, toastSuccess } from '$lib/util/toast-copy.util';

	const msg = m as Record<string, (inputs?: object) => string>;

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
	const cpoeOrderApiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/consultation/cpoe/order`
			: ''
	);

	async function apiGet<T>(
		mode: string,
		params: Record<string, string | string[] | undefined>
	): Promise<T> {
		const url = new URL(cpoeOrderApiBase, window.location.origin);
		url.searchParams.set('mode', mode);
		for (const [k, v] of Object.entries(params)) {
			if (v == null) continue;
			if (Array.isArray(v)) {
				for (const vv of v) url.searchParams.append(k, vv);
			} else {
				url.searchParams.set(k, v);
			}
		}
		const r = await fetch(url.toString(), { method: 'GET' });
		if (!r.ok) throw new Error(`Request failed (${r.status})`);
		return (await r.json()) as T;
	}

	async function apiPost<T>(
		mode: string,
		body: Record<string, unknown>
	): Promise<T> {
		const r = await fetch(cpoeOrderApiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode, ...body })
		});
		if (!r.ok) throw new Error(`Request failed (${r.status})`);
		return (await r.json()) as T;
	}

	type CpoeOrderVisitPayload = {
		patientId: string;
		hospitalId: string;
		branchId: string;
		visitNo?: string | null;
	};

	let visit = $state<CpoeOrderVisitPayload | null>(null);

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

	/** Maps `service_item.sub_category_id` → `sub_category.category_id` (Radiology=1, Nursing=2, Laboratory=5). */
	let subCategoryIdToCategoryId = $state<Map<number, number>>(
		new Map()
	);
	let serviceFilterSubCategoryPromise: Promise<void> | null = null;

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
			const v = await apiGet<CpoeOrderVisitPayload | null>(
				'visit.get',
				{
					visitId: String(visitId)
				}
			);
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
			const all = await apiGet<SubCategoryListRow[]>(
				'subCategory.list',
				{}
			);
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

	async function fetchBranchServices(
		hospitalIdForVisit: string,
		branchIdForVisit: string
	) {
		try {
			const [taggings, allServices] = await Promise.all([
				apiGet<ServiceTaggingListRow[]>('serviceTagging.list', {
					branchId: branchIdForVisit
				}),
				apiGet<PaginatedResult<ServiceItemListRow>>(
					'serviceItem.paginated',
					{
						serviceName: undefined,
						statusId: undefined,
						page: '1',
						pageSize: '500'
					}
				).then((r) => r.data ?? [])
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
		const res = await apiGet<PaginatedResult<StaffWithRelations>>(
			'doctor.search',
			{
				search: query.trim(),
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return (res.data ?? []).map((staff) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const staff = await apiGet<StaffWithRelations | null>(
			'staff.get',
			{
				id
			}
		);
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
		const paged = await apiGet<{ data: ServiceItemListRow[] }>(
			'serviceItem.paginated',
			{
				serviceName: query.trim(),
				statusId: String(StatusEnum.ACTIVE),
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return (paged.data ?? [])
			.filter(
				(service) =>
					effectiveServiceIds.has(service.id) &&
					serviceMatchesFilter(service, ctx.serviceFilter)
			)
			.map((service) => ({
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
		const service = await apiGet<ServiceItemListRow | null>(
			'serviceItem.byId',
			{ id: String(serviceId) }
		);
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
			const taggings = await apiGet<ServiceTaggingListRow[]>(
				'serviceTagging.list',
				{
					branchId: branchIdForVisit,
					serviceId: String(sid)
				}
			);
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
				loadPricing: loadPricingForDialog
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
			const newItem: PendingItem = {
				id: editRow?.id ?? nextId,
				serviceId,
				serviceName: data.serviceName,
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

	const detailColumns: MenziesTableColumn<PendingItem>[] = [
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
			format: (value) =>
				formatNumberDisplay(value as NumberDisplayInput)
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
			format: (value) =>
				formatNumberDisplay(value as NumberDisplayInput)
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
			format: (value) =>
				formatNumberDisplay(value as NumberDisplayInput)
		}
	];

	const historyColumns: MenziesTableColumn<HistoryItem>[] = [
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
		...(detailColumns as MenziesTableColumn<HistoryItem>[])
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
			const created = await apiPost<ServiceOrderListRow>(
				'serviceOrder.create',
				{
					payload: {
						branchId: visit.branchId,
						visitId,
						orderDate: dateStr,
						orderTime: timeStr
					}
				}
			);

			currentOrder = created;

			await Promise.all(
				pendingItems.map((item) =>
					apiPost<ServiceOrderDetailListRow>('orderLine.create', {
						payload: {
							serviceOrderId: created.id,
							serviceId: item.serviceId,
							advisingDoctorId: item.advisingDoctorId,
							serviceAmount: item.serviceAmount,
							serviceTaxAmount: item.serviceTaxAmount,
							serviceUnit: item.serviceUnit,
							instruction: item.instruction,
							isUrgent: item.isUrgent
						}
					})
				)
			);

			pendingItems = [];
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
			const orders = await apiGet<ServiceOrderListRow[]>(
				'serviceOrder.list',
				{ visitId: String(visitId) }
			);
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

			const details = await apiGet<ServiceOrderDetailListRow[]>(
				'orderLine.list',
				{
					visitId: String(visitId),
					serviceOrderIds: orderIds.map(String)
				}
			);

			const doctorIdSet = new Set<string>();
			for (const d of details) {
				const docId =
					(d.advisingDoctorId as string | null | undefined) ?? null;
				if (docId) doctorIdSet.add(docId);
			}

			const doctorIdList = Array.from(doctorIdSet);
			const resolvedStaff = await Promise.all(
				doctorIdList.map((id) =>
					apiGet<any | null>('staff.get', { id })
				)
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

			const allSubCats = await apiGet<any[]>('subCategory.list', {});
			const subCatNameById = new Map(
				allSubCats.map((s) => [
					Number(s.id),
					(s.subCategoryName ?? '').trim() || '–'
				])
			);

			const resolvedServiceRows = await Promise.all(
				serviceIdList.map((id) =>
					apiGet<ServiceItemListRow | null>('serviceItem.byId', {
						id: String(id)
					})
				)
			);
			const serviceSubCategoryNameMap = new Map<number, string>();
			serviceIdList.forEach((id, i) => {
				const svc = resolvedServiceRows[i];
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
			await apiPost<{ ok: true }>('orderLine.delete', {
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
						showRefreshButton={false}
						emptyMessage="Loading…"
						showRowActions={false}
						enableColumnFilters={false}
					/>
				</div>
			{:else}
				<div
					class="flex flex-wrap items-center justify-end gap-2"
				>
					<WashButton
						className="btn-outline btn-sm"
						onClick={handleShowHistory}
					>
						Order history
					</WashButton>
					<WashButton
						className="btn-primary btn-sm px-8"
						onClick={handleSaveOrder}
					>
						Save
					</WashButton>
				</div>

				<div
					class={TableEnum.HEIGHT}
				>
					<MenziesTable
						title="Order items (pending list)"
						description={pendingItems.length === 0
							? msg.cpoe_order_pending_empty()
							: ''}
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
						showAddButton={true}
						addLabel={msg.cpoe_order_add_to_list()}
						onAdd={openPendingLineDialog}
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
