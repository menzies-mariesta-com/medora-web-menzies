<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MariTable, {
		type MariTableColumn,
		type MariTableColumnsInput
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { InvDepartmentIndentStatusTaggingEnum } from '$lib/model/enum/db-link';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import InventoryTablePickerDialogContent from '$lib/component/own/local/private/medora/inventory/InventoryTablePickerDialogContent.svelte';
	import PoManualLinesCard from '$lib/component/own/local/private/medora/inventory/purchase-order/PoManualLinesCard.svelte';
	import DepartmentIssueLineDialogContent from '$lib/component/own/local/private/medora/inventory/department-issue/DepartmentIssueLineDialogContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import type {
		DepartmentIndentDetail,
		DepartmentIndentDetailLine
	} from '$lib/model/type/medora/department-indent-detail.type';
	import type {
		ConsumptionBatchAllocationDraft,
		ConsumptionDraftLineIum
	} from '$lib/model/type/medora/department-consumption-detail.type';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';
	const lifeCycle = new LifeCycleUtil();
	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const issueCreateMode = $derived(
		page.url.searchParams.get('mode') === 'manual'
			? 'manual'
			: 'indent'
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);
	const navFromStoreLabel = $derived.by(() => {
		const id = selectedInventoryFromStoreId;
		const fromMaster = stores.find((s) => s.id === id);
		if (fromMaster?.storeName?.trim()) return fromMaster.storeName.trim();
		const nav = (
			data as {
				inventoryFromStoresForNav?: {
					id: number;
					storeName: string | null;
				}[];
			}
		).inventoryFromStoresForNav;
		const row = nav?.find((s) => s.id === id);
		if (row?.storeName?.trim()) return row.storeName.trim();
		return '—';
	});

	type StoreRow = {
		id: number;
		storeName: string | null;
		branchId: string;
	};
	let stores = $state<StoreRow[]>([]);
	let storesAbort: AbortController | null = null;

	async function loadStores() {
		if (!hospitalId) return;
		storesAbort?.abort();
		storesAbort = new AbortController();
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores?mode=allForPicker`,
			{ method: 'GET', signal: storesAbort.signal }
		);
		stores = (await res.json()) as StoreRow[];
	}

	let toStoreIdStr = $state('');
	let remarks = $state('');

	let submitting = $state(false);

	type PendingIndentRow = {
		id: string;
		indentNo: string | null;
		fromStoreName: string | null;
		toStoreName: string | null;
		createdAt: string;
		statusTaggingId?: number;
		remarks?: string | null;
		itemNames?: string | null;
	};
	let pendingIndents = $state<PendingIndentRow[]>([]);
	let pendingIndentsLoading = $state(false);
	let issueIdByIndentId = $state<Record<string, string | null>>({});
	let selectedIndentId = $state<string | null>(null);
	let indentPickerBusy = $state(false);

	let indentPreviewLines = $state<
		DepartmentIndentDetailLine[] | null
	>(null);
	let indentPreviewLoading = $state(false);
	let indentPreviewError = $state<string | null>(null);

	type IssueDraftLine = {
		key: string;
		// These are only used by the shared PR line UX components.
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		itemId: number | null;
		itemLabel: string;
		iumList: ConsumptionDraftLineIum[];
		itemUnitMasterId: number | null;
		batchAllocations: ConsumptionBatchAllocationDraft[];
		lockItem?: boolean;
		purchaseUnitLabel?: string;
	};

	let createLines = $state<IssueDraftLine[]>([]);

	let lineItemDialogActive = $state(false);
	let editingLineKey = $state<string | null>(null);
	let editingIndentLineKey = $state<string | null>(null);
	let draftLine = $state<IssueDraftLine>(newLine());

	let selectedIndentDetail = $state<DepartmentIndentDetail | null>(
		null
	);
	let indentCreateLines = $state<IssueDraftLine[]>([]);

	const departmentIssueListPath = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/department-issue' as any
		)
	);

	async function goBackToList() {
		await goto(resolve(departmentIssueListPath as any));
	}

	function issueDetailHref(issueId: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/department-issue/${encodeURIComponent(issueId)}`;
	}

	async function loadPendingIndents() {
		if (!hospitalId || selectedInventoryFromStoreId == null) {
			pendingIndents = [];
			issueIdByIndentId = {};
			return;
		}
		pendingIndentsLoading = true;
		try {
			const ps = new URLSearchParams();
			ps.set('page', '1');
			ps.set('pageSize', String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE));
			ps.set(
				'statusTaggingId',
				String(InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL)
			);
			ps.set('toStoreId', String(selectedInventoryFromStoreId));
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-indent?${ps}`
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: PendingIndentRow[] };
			const rows = j.data ?? [];
			pendingIndents = rows;
			const map: Record<string, string | null> = {};
			await Promise.all(
				rows.map(async (row) => {
					const r = await fetch(
						`/api/medora/hospital/${hospitalId}/home/inventory/department-issue?sourceIndentId=${encodeURIComponent(row.id)}&pageSize=1`
					);
					if (!r.ok) {
						map[row.id] = null;
						return;
					}
					const jj = (await r.json()) as { data: { id: string }[] };
					map[row.id] = jj.data?.[0]?.id ?? null;
				})
			);
			issueIdByIndentId = map;
		} catch (e) {
			toast.addErrorToast('Indents', e);
			pendingIndents = [];
			issueIdByIndentId = {};
		} finally {
			pendingIndentsLoading = false;
		}
	}

	$effect(() => {
		if (issueCreateMode !== 'indent') return;
		void hospitalId;
		void selectedInventoryFromStoreId;
		void loadPendingIndents();
	});

	const selectedIndentRow = $derived(
		selectedIndentId == null
			? null
			: (pendingIndents.find((r) => r.id === selectedIndentId) ??
					null)
	);

	async function openIndentPicker() {
		if (!hospitalId || selectedInventoryFromStoreId == null) return;
		indentPickerBusy = true;
		try {
			await loadPendingIndents();
			const result = await dialogService.open<PendingIndentRow>({
				fullScreen: true,
				component: InventoryTablePickerDialogContent,
				props: {
					title: m.inv_dept_issue_select_indent(),
					columns: indentPickerColumns as MariTableColumnsInput,
					rows: pendingIndents,
					pageSize: String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
				}
			});
			if (result.confirmed && result.data) {
				selectedIndentId = result.data.id;
			}
		} finally {
			indentPickerBusy = false;
		}
	}

	const selectedIndentSummary = $derived.by(() => {
		if (!selectedIndentId) return '';
		const ind = pendingIndents.find((r) => r.id === selectedIndentId);
		if (!ind) return '';
		return `${ind.indentNo ?? '—'} · ${ind.fromStoreName ?? '—'} → ${ind.toStoreName ?? '—'}`;
	});

	function pickerDeptIndentStatusLabel(id: number): string {
		switch (id) {
			case InvDepartmentIndentStatusTaggingEnum.DRAFT:
				return m.inv_dept_status_draft();
			case InvDepartmentIndentStatusTaggingEnum.PENDING:
				return m.inv_dept_status_pending();
			case InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL:
				return m.inv_dept_status_pending_fulfill();
			case InvDepartmentIndentStatusTaggingEnum.ISSUED:
				return m.inv_dept_status_issued();
			case InvDepartmentIndentStatusTaggingEnum.RECEIVED:
				return m.inv_dept_status_received();
			case InvDepartmentIndentStatusTaggingEnum.CANCELLED:
				return m.inv_dept_status_cancelled();
			default:
				return String(id);
		}
	}

	function pickerCsvItemLines(
		csv: string | null | undefined
	): string {
		const lines = (csv ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return lines.join('\n') || '—';
	}

	const indentPickerColumns = $derived.by((): MariTableColumn[] => [
		{
			id: 'indentNo',
			header: m.inv_dept_indent_no(),
			field: 'indentNo',
			filterable: false,
			format: (_v, row) => (row as PendingIndentRow).indentNo ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			filterable: false,
			format: (_v, row) => {
				const id = (row as PendingIndentRow).statusTaggingId;
				return id != null ? pickerDeptIndentStatusLabel(id) : '—';
			}
		},
		{
			id: 'fromStore',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreName',
			filterable: false,
			format: (_v, row) =>
				(row as PendingIndentRow).fromStoreName ?? '—'
		},
		{
			id: 'toStore',
			header: m.inv_dept_indent_to(),
			field: 'toStoreName',
			filterable: false,
			format: (_v, row) =>
				(row as PendingIndentRow).toStoreName ?? '—'
		},
		{
			id: 'items',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line align-middle max-w-xs',
			format: (_v, row) =>
				pickerCsvItemLines((row as PendingIndentRow).itemNames)
		},
		{
			id: 'remarks',
			header: m.remark(),
			field: 'remarks',
			filterable: false,
			cellClass: 'whitespace-pre-wrap align-top max-w-xs',
			format: (_v, row) =>
				(row as PendingIndentRow).remarks?.trim() || '—'
		}
	]);

	$effect(() => {
		if (!hospitalId || !selectedIndentId) {
			indentPreviewLines = null;
			indentPreviewError = null;
			selectedIndentDetail = null;
			indentCreateLines = [];
			return;
		}
		void (async () => {
			indentPreviewLoading = true;
			indentPreviewError = null;
			try {
				const res = await fetch(
					`/api/medora/hospital/${hospitalId}/home/inventory/department-indent?id=${encodeURIComponent(selectedIndentId)}`
				);
				if (!res.ok) {
					throw new Error(String(res.status));
				}
				const j = (await res.json()) as DepartmentIndentDetail | null;
				selectedIndentDetail = j ?? null;
				indentPreviewLines = j?.lines ?? null;
				remarks = j?.remarks?.trim() ? j.remarks.trim() : remarks;
				indentCreateLines = (j?.lines ?? []).map((ln) => {
					const pf = ln.purchaseConversionFactor?.trim() || '';
					const iff = ln.issueConversionFactor?.trim() || '';
					const hasFactors = pf !== '' && iff !== '';
					const itemUnitMasterId = ln.itemUnitMasterId ?? null;
					const purchaseUnitName = ln.unitName?.trim()
						? ln.unitName.trim()
						: '—';
					const ium: ConsumptionDraftLineIum | null =
						hasFactors && itemUnitMasterId != null
							? {
									id: itemUnitMasterId,
									conversionDisplay:
										ln.itemUnitMasterConversion?.trim() ||
										purchaseUnitName,
									purchaseUnitId: ln.unitId,
									issueUnitId: 0,
									purchaseUnitName,
									issueUnitName: ln.issueUnitName?.trim() || '',
									purchaseConversionFactor: pf,
									issueConversionFactor: iff
								}
							: null;
					return {
						key: crypto.randomUUID(),
						itemSearch: ln.itemName ?? '',
						hits: [],
						itemId: ln.itemId,
						itemLabel: ln.itemName ?? '—',
						iumList: ium ? [ium] : [],
						itemUnitMasterId: ium?.id ?? itemUnitMasterId,
						batchAllocations: [],
						lockItem: true,
						purchaseUnitLabel: purchaseUnitName
					} satisfies IssueDraftLine;
				});
			} catch (e) {
				console.error('Failed to load indent lines', e);
				indentPreviewLines = null;
				selectedIndentDetail = null;
				indentCreateLines = [];
				indentPreviewError = 'Failed to load indent lines';
			} finally {
				indentPreviewLoading = false;
			}
		})();
	});

	$effect(() => {
		const ids = new Set(pendingIndents.map((r) => r.id));
		if (selectedIndentId != null && !ids.has(selectedIndentId)) {
			selectedIndentId = null;
		}
	});

	const toStoreOptions = $derived.by((): StoreRow[] => {
		const fromId = selectedInventoryFromStoreId;
		if (fromId == null) {
			return stores;
		}
		// Match PR="To store" behavior: show all stores (except the selected from store).
		// Do not restrict by branch, otherwise the dropdown can become empty even when
		// other stores exist in different branches.
		return stores.filter((s) => s.id !== fromId);
	});

	$effect(() => {
		void hospitalId;
		void loadStores();
	});

	$effect(() => {
		// If the current value disappears from options (e.g. nav store switch),
		// reset it so the select doesn't get="stuck" on an invalid id.
		const v = toStoreIdStr.trim();
		if (!v) return;
		const ids = new Set(toStoreOptions.map((s) => String(s.id)));
		if (!ids.has(v)) toStoreIdStr = '';
	});

	lifeCycle.onMount(() => {
		toStoreIdStr = '';
		remarks = '';
		createLines = [];
		selectedIndentId = null;
		lineItemDialogActive = false;
		editingLineKey = null;
		draftLine = newLine();
		selectedIndentDetail = null;
		indentCreateLines = [];
	});

	function newLine(): IssueDraftLine {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			iumList: [],
			itemUnitMasterId: null,
			batchAllocations: []
		};
	}

	function conversionLabelForLine(line: IssueDraftLine): string {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.conversionDisplay ?? '—';
	}

	function totalPurchaseQty(line: IssueDraftLine): string {
		let sum = 0;
		for (const a of line.batchAllocations) {
			const n = Number(String(a.qtyPurchase).trim());
			if (Number.isFinite(n) && n > 0) sum += n;
		}
		return sum > 0 ? String(sum) : '—';
	}

	function lineIumFactors(line: IssueDraftLine): {
		pf: string;
		iff: string;
	} | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		if (!ium) return null;
		return {
			pf: ium.purchaseConversionFactor,
			iff: ium.issueConversionFactor
		};
	}

	async function openLineDialogForCreate() {
		editingLineKey = null;
		draftLine = newLine();
		lineItemDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_add(),
				modalClassName: 'max-w-4xl',
				component: DepartmentIssueLineDialogContent,
				props: {
					hospitalId,
					storeId: selectedInventoryFromStoreId,
					draftLine,
					searchItemsFn: searchItemsForPrLine,
					onPersist: persistDraftLineFromModal
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingLineKey = null;
		}
	}

	async function openLineDialogForEdit(line: IssueDraftLine) {
		editingLineKey = line.key;
		draftLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList],
			batchAllocations: line.batchAllocations.map((a) => ({ ...a }))
		};
		lineItemDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_edit(),
				modalClassName: 'max-w-4xl',
				component: DepartmentIssueLineDialogContent,
				props: {
					hospitalId,
					storeId: selectedInventoryFromStoreId,
					draftLine,
					searchItemsFn: searchItemsForPrLine,
					onPersist: persistDraftLineFromModal
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingLineKey = null;
		}
	}

	async function searchItemsForPrLine(q: string) {
		if (!hospitalId) return [];
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?name=${encodeURIComponent(q.trim())}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = (await res.json()) as {
			data: { id: number; itemName: string | null }[];
		};
		return (j.data ?? []).map((x) => ({
			label: x.itemName ?? '—',
			value: String(x.id)
		}));
	}

	function purchaseUnitForLine(line: IssueDraftLine): number | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.purchaseUnitId ?? null;
	}

	function persistDraftLineFromModal() {
		const src = draftLine;
		const row: IssueDraftLine = {
			...src,
			hits: [...src.hits],
			iumList: [...src.iumList],
			batchAllocations: src.batchAllocations.map((a) => ({ ...a }))
		};
		if (editingLineKey) {
			createLines = createLines.map((x) =>
				x.key === editingLineKey ? row : x
			);
		} else {
			createLines = [...createLines, row];
		}
	}

	function deleteLine(lineKey: string) {
		createLines = createLines.filter((l) => l.key !== lineKey);
	}

	async function openIndentLineDialogForEdit(line: IssueDraftLine) {
		editingIndentLineKey = line.key;
		draftLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList],
			batchAllocations: line.batchAllocations.map((a) => ({ ...a })),
			lockItem: true
		};
		lineItemDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_edit(),
				modalClassName: 'max-w-4xl',
				component: DepartmentIssueLineDialogContent,
				props: {
					hospitalId,
					storeId: selectedInventoryFromStoreId,
					draftLine,
					searchItemsFn: searchItemsForPrLine,
					onPersist: persistIndentDraftLineFromModal
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingIndentLineKey = null;
		}
	}

	function persistIndentDraftLineFromModal() {
		const src = draftLine;
		const row: IssueDraftLine = {
			...src,
			hits: [...src.hits],
			iumList: [...src.iumList],
			batchAllocations: src.batchAllocations.map((a) => ({ ...a })),
			lockItem: true
		};
		if (editingIndentLineKey) {
			indentCreateLines = indentCreateLines.map((x) =>
				x.key === editingIndentLineKey ? row : x
			);
		}
	}

	function buildLinesPayload(lines: IssueDraftLine[]):
		| {
				ok: true;
				lines: {
					itemId: number;
					quantity: string;
					unitId: number;
					batchId: number;
				}[];
		  }
		| { ok: false; title: string; detail: string } {
		const payload: {
			itemId: number;
			quantity: string;
			unitId: number;
			batchId: number;
		}[] = [];
		for (const ln of lines) {
			const uid = purchaseUnitForLine(ln);
			const factors = lineIumFactors(ln);
			if (ln.itemId == null || uid == null || factors == null) {
				return {
					ok: false,
					title: 'Issue',
					detail: 'Each line needs an item and unit conversion.'
				};
			}
			const { pf, iff } = factors;
			let hasPositive = false;
			for (const a of ln.batchAllocations) {
				const q = a.qtyPurchase.trim();
				if (!q) continue;
				const n = Number(q);
				if (!Number.isFinite(n) || n <= 0) {
					return {
						ok: false,
						title: 'Issue',
						detail: 'Invalid quantity on a batch allocation.'
					};
				}
				hasPositive = true;
				const need = purchaseQtyToIssueQtyNumber(q, pf, iff);
				if (need == null || need > Number(a.stockIssueQty) + 1e-6) {
					return {
						ok: false,
						title: 'Issue',
						detail: 'Allocated quantity exceeds stock.'
					};
				}
				payload.push({
					itemId: ln.itemId,
					quantity: q,
					unitId: uid,
					batchId: a.batchId
				});
			}
			if (!hasPositive) {
				return {
					ok: false,
					title: 'Issue',
					detail: 'Total qty to use must be greater than 0.'
				};
			}
		}
		if (payload.length === 0) {
			return {
				ok: false,
				title: 'Issue',
				detail: 'Add at least one line.'
			};
		}
		return { ok: true, lines: payload };
	}

	const lineColumns = $derived.by(
		(): MariTableColumn<IssueDraftLine>[] => [
			{
				id: 'itemLabel',
				header: m.inv_common_item(),
				field: 'itemLabel',
				filterable: true,
				format: (_v: unknown, row: IssueDraftLine) =>
					row.itemLabel || '—'
			},
			{
				id: 'conversion',
				header: m.inv_common_unit(),
				field: 'itemUnitMasterId',
				filterable: true,
				format: (_v: unknown, row: IssueDraftLine) =>
					conversionLabelForLine(row)
			},
			{
				id: 'quantity',
				header: m.inv_common_quantity(),
				filterable: true,
				field: 'qtySearch',
				format: (_v: unknown, row: IssueDraftLine) =>
					formatPurchaseQtyCellWithIssueEquivalent({
						quantity: (row as any).qtySearch ?? totalPurchaseQty(row),
						itemUnitMasterId: row.itemUnitMasterId,
						purchaseConversionFactor:
							row.iumList.find((u) => u.id === row.itemUnitMasterId)
								?.purchaseConversionFactor ?? null,
						issueConversionFactor:
							row.iumList.find((u) => u.id === row.itemUnitMasterId)
								?.issueConversionFactor ?? null,
						issueUnitName:
							row.iumList.find((u) => u.id === row.itemUnitMasterId)
								?.issueUnitName ?? null
					} as any)
			}
		]
	);
	async function submitCreate() {
		if (!hospitalId) return;
		const from = selectedInventoryFromStoreId;
		const toStoreId =
			toStoreIdStr !== '' ? Number(toStoreIdStr) : null;
		if (from == null || toStoreId == null) {
			toast.addToast(
				'Issue',
				StatusColorEnum.ERROR,
				'From / to store required'
			);
			return;
		}

		const built = buildLinesPayload(createLines);
		if (!built.ok) {
			toast.addToast(
				built.title,
				StatusColorEnum.ERROR,
				built.detail
			);
			return;
		}

		const payload = {
			fromStoreId: from,
			toStoreId,
			remarks: remarks.trim() || null,
			lines: built.lines
		};

		submitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-issue`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!res.ok) {
				toast.addToast(
					'Issue',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			await goBackToList();
		} finally {
			submitting = false;
		}
	}

	async function submitCreateFromIndent() {
		if (!hospitalId) return;
		const ind = selectedIndentDetail;
		const from = selectedInventoryFromStoreId;
		if (!ind || from == null) return;
		if (ind.toStoreId !== from) {
			toast.addToast(
				'Issue',
				StatusColorEnum.ERROR,
				'Select the central store (indent “to” store) in the top bar.'
			);
			return;
		}
		const built = buildLinesPayload(indentCreateLines);
		if (!built.ok) {
			toast.addToast(
				built.title,
				StatusColorEnum.ERROR,
				built.detail
			);
			return;
		}
		const payload = {
			fromStoreId: from,
			toStoreId: ind.fromStoreId,
			sourceIndentId: ind.id,
			remarks: remarks.trim() || null,
			lines: built.lines
		};
		submitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-issue`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!res.ok) {
				toast.addToast(
					'Issue',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			const created = (await res.json()) as { id?: string };
			if (created?.id) {
				await goto(resolve(issueDetailHref(created.id) as any));
				return;
			}
			await goBackToList();
		} finally {
			submitting = false;
		}
	}
</script>

<WashCard>
	<WashCardBody>
		<div class="mb-5 flex flex-wrap items-center gap-2">
			<WashTooltip
				tooltipText={m.inv_common_back_to_list()}
				className="tooltip-ghost"
			>
				<WashButton
					type="button"
					className="btn-sm btn-ghost btn-square"
					onClick={() => void goBackToList()}
				>
					<LucideArrowLeft className="size-4" />
				</WashButton>
			</WashTooltip>
			<WashCardBodyTitle className="mb-0 min-w-0 flex-1">
				{issueCreateMode === 'manual'
					? m.inv_dept_issue_new_title_manual()
					: m.inv_dept_issue_new_title()}
			</WashCardBodyTitle>
		</div>

		{#if issueCreateMode === 'manual'}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					void submitCreate();
				}}
			>
				{#snippet manualLinesToolbarRight()}
					<WashTooltip
						tooltipText={m.inv_line_items_add()}
						className="tooltip-ghost"
					>
						<WashButton
							type="button"
							className="btn-primary btn-square btn-outline"
							disabled={submitting}
							title={m.inv_line_items_add()}
							onClick={() => void openLineDialogForCreate()}
						>
							<LucidePlus className="size-4" />
						</WashButton>
					</WashTooltip>
				{/snippet}
				<div
					class="mb-6 flex flex-wrap items-center justify-end gap-3 border-b border-base-200 pb-6"
				>
					<WashButton
						type="submit"
						className="btn-primary btn-wide"
						disabled={submitting || createLines.length === 0}
						loading={submitting}
					>
						{m.inv_common_submit()}
					</WashButton>
				</div>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<div
						class="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
					>
						<div class="min-w-0 flex-1">
							<div
								class="flex flex-col gap-6 sm:flex-row sm:items-stretch"
							>
								<div class="min-w-0 flex-1">
									<div
										class="flex h-full flex-col justify-between gap-3"
									>
										<div class="flex min-w-0 flex-col gap-2">
											<label class="text-xs">{m.inv_nav_from_store()}</label>
											<input
												type="text"
												readonly
												disabled
												class="input-bordered input w-full text-sm"
												value={navFromStoreLabel}
												aria-label={m.inv_nav_from_store()}
											/>
										</div>
										<div class="flex min-w-0 flex-col gap-2">
											<label for="di-issue-to-store" class="text-xs">{m.inv_dept_indent_to()}</label>
											<WashSearchSelect
												inputId="di-issue-to-store"
												value={toStoreIdStr}
												options={toStoreOptions.map((s) => ({
													label: s.storeName?.trim()
														? s.storeName.trim()
														: '—',
													value: String(s.id)
												}))}
												onChange={(v: string) => {
													toStoreIdStr = v;
												}}
												placeholder={m.inv_common_search()}
												className="input w-full"
											/>
										</div>
									</div>
								</div>

								<div class="flex min-w-0 flex-1 flex-col">
									<label class="text-xs">{m.inv_dept_indent_remarks()}</label>
									<textarea
										class="textarea-bordered textarea mt-1 w-full flex-1"
										rows="2"
										bind:value={remarks}
									></textarea>
								</div>
							</div>
						</div>
					</div>
				</fieldset>

				<PoManualLinesCard
					totalCount={createLines.length}
					columns={lineColumns}
					rows={createLines.map((ln) => ({
						...ln,
						qtySearch: totalPurchaseQty(ln)
					}))}
					useColumnFilters={true}
					hideQuickFilter={true}
					hideAddButton={true}
					toolbarRight={manualLinesToolbarRight}
					onAddItem={() => void openLineDialogForCreate()}
					onEditLine={(line) => void openLineDialogForEdit(line)}
					onDeleteLine={deleteLine}
				/>
			</form>
		{:else if selectedInventoryFromStoreId == null}
			<div class="alert text-sm alert-warning" role="status">
				{m.inv_dept_issue_select_store_hint()}
			</div>
		{:else}
			<div
				class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10"
			>
				<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
					<div
						class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"
					>
						<div
							class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
						>
							<label for="di-issue-indent-display" class="shrink-0 sm:w-36">
								{m.inv_dept_issue_select_indent()}
							</label>
							<div
								class="flex max-w-80 min-w-0 flex-1 flex-wrap items-stretch gap-2 sm:flex-nowrap"
							>
								<input
									id="di-issue-indent-display"
									type="text"
									readonly
									disabled
									class="input-bordered input min-w-0 flex-1 text-sm"
									value={selectedIndentSummary || '—'}
									aria-label={m.inv_dept_issue_select_indent()}
								/>
								<WashButton
									type="button"
									className="btn-outline shrink-0"
									disabled={pendingIndentsLoading || indentPickerBusy}
									loading={indentPickerBusy}
									onClick={() => void openIndentPicker()}
								>
									{m.inv_common_btn_select()}
								</WashButton>
							</div>
						</div>
					</div>
				</fieldset>
			</div>
			{#if selectedIndentId}
				{@const selIndentId = selectedIndentId}
				<div
					class="mb-6 flex flex-wrap items-center justify-end gap-3 border-b border-base-200 pb-6"
				>
					{#if issueIdByIndentId[selIndentId]}
						<WashButton
							type="button"
							className="btn-wide btn-primary"
							disabled={pendingIndentsLoading}
							onClick={() =>
								void goto(
									resolve(
										issueDetailHref(
											issueIdByIndentId[selIndentId]!
										) as any
									)
								)}
						>
							{m.inv_dept_issue_btn_open()}
						</WashButton>
					{:else}
						<WashButton
							type="button"
							className="btn-wide btn-primary"
							disabled={pendingIndentsLoading ||
								submitting ||
								indentCreateLines.length === 0}
							loading={submitting}
							onClick={() => void submitCreateFromIndent()}
						>
							{m.inv_dept_issue_btn_create()}
						</WashButton>
					{/if}
				</div>
			{/if}
			{#if !pendingIndentsLoading && pendingIndents.length === 0}
				<div
					class="rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80"
				>
					{m.inv_dept_issue_no_pending_indents()}
				</div>
			{/if}
			{#if selectedIndentRow}
				<p class="mb-3 text-sm text-base-content/80">
					<span class="opacity-70">{m.inv_pr_route()}</span>
					<strong
						>{selectedIndentRow.fromStoreName ?? '—'} → {selectedIndentRow.toStoreName ??
							'—'}</strong
					>
				</p>
				<div
					class="mb-4 rounded-box border border-base-300 bg-base-100 p-3"
				>
					<div class="mb-2 text-sm font-medium">
						{m.inv_di_detail_lines()}
					</div>
					{#if indentPreviewLoading}
						<div class="text-xs text-base-content/70">
							{m.loading()}
						</div>
					{:else if indentPreviewError}
						<div class="text-xs text-error">{indentPreviewError}</div>
					{:else if !indentPreviewLines || indentPreviewLines.length === 0}
						<div class="text-xs text-base-content/70">—</div>
					{:else}
						<MariTable
							rows={indentPreviewLines}
							columns={[
								{
									id: 'itemName',
									header: m.inv_common_item(),
									field: 'itemName',
									filterable: false,
									format: (_v, r: DepartmentIndentDetailLine) =>
										r.itemName ?? '—'
								},
								{
									id: 'quantity',
									header: m.inv_common_quantity(),
									field: 'quantity',
									filterable: false,
									format: (_v, r: DepartmentIndentDetailLine) =>
										r.quantity
								},
								{
									id: 'unitName',
									header: m.inv_common_unit(),
									field: 'unitName',
									filterable: false,
									format: (_v, r: DepartmentIndentDetailLine) =>
										r.unitName ?? '—'
								}
							] as MariTableColumn[]}
							showRowActions={false}
							actionsVariant="none"
							showRefreshButton={false}
						/>
					{/if}
				</div>

				<div
					class="mb-4 rounded-box border border-base-300 bg-base-100 p-3"
				>
					<div class="mb-2 text-sm font-medium">
						{m.inv_dc_batch()}
					</div>
					<p class="mb-3 text-xs opacity-70">
						{m.inv_dc_modal_batch_help()}
					</p>
					<MariTable
						rows={indentCreateLines}
						columns={lineColumns as MariTableColumn[]}
						showRefreshButton={false}
						enableColumnFilters={false}
						showRowActions={true}
						actionsVariant="none"
					>
						{#snippet rowActions(_row, index)}
							{@const ln = indentCreateLines[index]}
							<WashTooltip
								tooltipText={m.inv_line_items_tooltip_edit()}
								className="tooltip-accent"
							>
								<WashButton
									type="button"
									className="btn-sm btn-ghost btn-square text-accent"
									disabled={!ln || submitting}
									onClick={() => {
										if (ln) void openIndentLineDialogForEdit(ln);
									}}
								>
									<LucidePencil className="size-5" />
								</WashButton>
							</WashTooltip>
						{/snippet}
					</MariTable>
				</div>
			{/if}
		{/if}
	</WashCardBody>
</WashCard>
