<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import type {
		ServiceItemListRow,
		ServiceOrderDetailListRow,
		ServiceOrderListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { formatMoneyAmount } from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { EMR_NURSING_COMPLETE_PRINT_DOCUMENT_CODE } from '$lib/model/constant/emr-print.constant';
	import {
		buildDocumentPlaceholderContext,
		buildVisitServiceLinesTableHtml,
		resolveDocumentTemplate
	} from '$lib/util/document-placeholder.util';
	import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
	import { fetchVisitServiceLinePrintRows } from '$lib/util/visit-service-lines-print.util';

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
	let lastFetchKey: string | null = $state(null);
	let lastLoadedVisitKey: string = $state('');
	let tableFilters = $state<Record<string, string>>({
		status: String(StatusEnum.ACTIVE)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let initialized: boolean = $state(false);
	let isPrinting = $state(false);
	let nursingIncompleteCount = $state(0);
	let isBatchCompleting = $state(false);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let serviceItems = $state<ServiceItemListRow[]>([]);
	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const printByName = $derived(
		typeof page.data?.printByName === 'string'
			? page.data.printByName
			: ''
	);

	const canPrintNursing = $derived(
		!isPrinting && Boolean(visitId && visit && hospitalId)
	);

	const pageSizeNumber = $derived(
		Number(pageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE
	);

	const canCompleteNextBatch = $derived(
		Boolean(
			visitId &&
			visit &&
			hospitalId &&
			nursingIncompleteCount > 0 &&
			!isBatchCompleting
		)
	);

	const subtotal = $derived(
		rows.reduce((sum, row) => sum + parseAmount(row.serviceAmount), 0)
	);
	const totalTax = $derived(
		rows.reduce(
			(sum, row) => sum + parseAmount(row.serviceTaxAmount),
			0
		)
	);
	const grandTotal = $derived(
		rows.reduce((sum, row) => sum + row.lineTotal, 0)
	);

	function parseAmount(value: string | null | undefined): number {
		const num = Number(value ?? 0);
		return Number.isFinite(num) ? num : 0;
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

	function statusFilterDetailStatusId(): number | undefined {
		const statusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		return statusId != null && Number.isFinite(statusId)
			? statusId
			: undefined;
	}

	async function refreshNursingIncompleteCount() {
		if (!visitId || !hospitalId) {
			nursingIncompleteCount = 0;
			return;
		}
		try {
			const qs = new URLSearchParams({
				mode: 'nursingIncomplete.count',
				visitId: String(visitId)
			});
			const statusId = statusFilterDetailStatusId();
			if (statusId != null) qs.set('statusId', String(statusId));
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?${qs.toString()}`
			);
			if (!res.ok) throw new Error(`Count failed (${res.status})`);
			nursingIncompleteCount = await res.json();
		} catch {
			nursingIncompleteCount = 0;
		}
	}

	async function fetchNursingComplete(options?: { force?: boolean }) {
		if (!visitId || !hospitalId) {
			visit = null;
			rows = [];
			nursingIncompleteCount = 0;
			return;
		}

		const pageSize = Number(pageSizeStr) || 10;
		const requestKey = JSON.stringify({
			visitId,
			hospitalId,
			page: currentPage,
			pageSize,
			status: tableFilters.status ?? ''
		});

		if (!options?.force && requestKey === lastFetchKey) {
			return;
		}
		lastFetchKey = requestKey;

		isLoading = true;
		try {
			const visitRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?mode=visit.get&visitId=${visitId}`
			);
			if (!visitRes.ok)
				throw new Error(`Visit load failed (${visitRes.status})`);
			const currentVisit = await visitRes.json();
			if (!currentVisit) {
				visit = null;
				rows = [];
				nursingIncompleteCount = 0;
				totalRows = 0;
				return;
			}

			visit = {
				patientId: currentVisit.patientId,
				hospitalId: currentVisit.hospitalId,
				branchId: currentVisit.branchId,
				visitNo: currentVisit.visitNo ?? null
			};

			const ordersRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?mode=serviceOrder.list&visitId=${visitId}`
			);
			if (!ordersRes.ok)
				throw new Error(`Orders load failed (${ordersRes.status})`);
			const orders = await ordersRes.json();
			if (orders.length === 0) {
				rows = [];
				totalRows = 0;
				await refreshNursingIncompleteCount();
				return;
			}

			const orderIds = (orders as { id: number }[]).map((o) => o.id);
			const pageSize = Number(pageSizeStr) || 10;
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const detailQs = new URLSearchParams({
				mode: 'orderDetail.paginated',
				page: String(currentPage),
				pageSize: String(pageSize)
			});
			for (const id of orderIds)
				detailQs.append('serviceOrderIds', String(id));
			if (statusId != null && Number.isFinite(statusId))
				detailQs.set('statusId', String(statusId));
			const detailsRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?${detailQs.toString()}`
			);
			if (!detailsRes.ok)
				throw new Error(`Details load failed (${detailsRes.status})`);
			const detailsResult = await detailsRes.json();
			const details = detailsResult.data;
			totalRows = detailsResult.total;
			if (serviceItems.length === 0) {
				const docsRes = await fetch(
					`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/order?mode=serviceItem.paginated&page=1&pageSize=1000`
				);
				if (docsRes.ok) {
					const paged = await docsRes.json();
					serviceItems = Array.isArray(paged?.data) ? paged.data : [];
				}
			}

			const serviceById: Record<number, ServiceItemListRow> = {};
			for (const service of serviceItems) {
				serviceById[service.id] = service;
			}

			const orderById: Record<number, ServiceOrderListRow> = {};
			for (const order of orders) {
				orderById[order.id] = order;
			}

			rows = details.map((detail: ServiceOrderDetailListRow) => {
				const service = serviceById[detail.serviceId];
				const order = orderById[detail.serviceOrderId];
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
			initialized = true;
			await refreshNursingIncompleteCount();
		} catch (error) {
			console.error('Failed to load nursing complete rows', error);
			rows = [];
			totalRows = 0;
			nursingIncompleteCount = 0;
		} finally {
			isLoading = false;
		}
	}

	let mounted = $state(false);

	lifeCycleUtil.onMount(() => {
		mounted = true;
		if (!hospitalId) return;
		fetch(
			`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?mode=documentSettings.list`
		)
			.then((r) => (r.ok ? r.json() : []))
			.then((s) => {
				documentSettings = Array.isArray(s) ? s : [];
			})
			.catch(() => {
				documentSettings = [];
			});
	});

	$effect(() => {
		if (!mounted) return;

		if (visitId && hospitalId) {
			const visitKey = `${visitId}:${hospitalId}`;
			if (lastLoadedVisitKey === visitKey) {
				return;
			}
			lastLoadedVisitKey = visitKey;
			fetchNursingComplete();
		} else {
			lastLoadedVisitKey = '';
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
			format: (value) =>
				formatMoneyAmount(parseAmount(value as string | null))
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (value) =>
				formatMoneyAmount(parseAmount(value as string | null))
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
			format: (value) => formatMoneyAmount(Number(value ?? 0))
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

	async function printNursingComplete() {
		if (!visitId || !visit || !hospitalId) {
			toastService.addToast(
				'Select a visit to print.',
				StatusColorEnum.WARNING
			);
			return;
		}

		isPrinting = true;
		try {
			const docRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?mode=documentMaster.byCode&code=${encodeURIComponent(
					EMR_NURSING_COMPLETE_PRINT_DOCUMENT_CODE
				)}`
			);
			if (!docRes.ok)
				throw new Error(`Template load failed (${docRes.status})`);
			const masterDoc = await docRes.json();
			if (!masterDoc) {
				toastService.addToast(
					'Print template not found. Run DB seed or create document code NURSING_COMPLETE_PRINT.',
					StatusColorEnum.ERROR
				);
				return;
			}

			const visitFullRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete?mode=visit.get&visitId=${visitId}`
			);
			if (!visitFullRes.ok)
				throw new Error(`Visit load failed (${visitFullRes.status})`);
			const visitFull = await visitFullRes.json();
			const patientId = visitFull?.patient?.id;
			if (!visitFull || !patientId) {
				toastService.addToast(
					'Visit or patient data missing.',
					StatusColorEnum.ERROR
				);
				return;
			}

			const printRows = await fetchVisitServiceLinePrintRows({
				visitId,
				hospitalId
			});
			const tableHtml = buildVisitServiceLinesTableHtml(printRows);
			const context = buildDocumentPlaceholderContext(
				visitFull,
				masterDoc,
				{
					printBy: printByName,
					extraPlaceholders: {
						'{{visit.service_lines_table}}': tableHtml
					}
				}
			);
			const documentHtml = resolveDocumentTemplate(
				masterDoc.documentText,
				context
			).trim();
			const setting = resolveDocumentSettingForDoc(
				documentSettings,
				masterDoc
			);
			const headerHtml = resolveDocumentTemplate(
				setting?.headerHtml,
				context
			).trim();
			const footerHtml = resolveDocumentTemplate(
				setting?.footerHtml,
				context
			).trim();
			const documentTitle =
				masterDoc.documentNumber ||
				masterDoc.documentType?.documentType ||
				'Nursing complete';

			const htmlBrowser = buildPrintDocumentHtml({
				documentHtml,
				documentTitle,
				headerHtml,
				footerHtml,
				setting,
				variant: 'browser'
			});
			const htmlPdf = buildPrintDocumentHtml({
				documentHtml,
				documentTitle,
				headerHtml,
				footerHtml,
				setting,
				variant: 'pdfRaster'
			});

			let iframe = document.getElementById(
				'nursing-complete-print-iframe'
			) as HTMLIFrameElement | null;
			if (!iframe) {
				iframe = document.createElement('iframe');
				iframe.id = 'nursing-complete-print-iframe';
				iframe.style.cssText =
					'position:absolute;width:0;height:0;border:0;visibility:hidden;';
				document.body.appendChild(iframe);
			}
			const printWindow = iframe.contentWindow;
			if (!printWindow) {
				toastService.addToast(
					'Failed to prepare print',
					StatusColorEnum.ERROR
				);
				return;
			}
			printWindow.document.open();
			printWindow.document.write(htmlBrowser);
			printWindow.document.close();
			await new Promise((resolve) => setTimeout(resolve, 150));
			printWindow.print();

			try {
				const blob = await htmlStringToPdfBlob(htmlPdf);
				const safeBase =
					`nursing-complete-${visit.visitNo || visitId}-${Date.now()}`
						.replace(/[^\w.-]+/g, '_')
						.slice(0, 120);
				const url = await uploadPatientAttachmentPdf(
					blob,
					`${safeBase}.pdf`
				);
				await persistEmrPrintPdf({
					hospitalId,
					patientId,
					visitId,
					documentId: masterDoc.id,
					fileUrl: url,
					attachmentDescription: `Nursing complete print (visit ${visit.visitNo ?? visitId})`
				});
				toastService.addToast(
					'PDF saved to patient attachments and tagged.',
					StatusColorEnum.SUCCESS
				);
			} catch (saveErr) {
				console.error('Nursing print PDF save failed', saveErr);
				toastService.addToast(
					'Printed, but saving PDF to the patient record failed.',
					StatusColorEnum.WARNING
				);
			}
		} catch (err) {
			console.error('Nursing print failed', err);
			toastService.addToast(
				'Failed to prepare print',
				StatusColorEnum.ERROR
			);
		} finally {
			isPrinting = false;
		}
	}

	async function handleComplete(row: NursingCompleteRow) {
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'nursingComplete.mark',
						id: row.id
					})
				}
			);
			if (!res.ok) throw new Error(`Mark failed (${res.status})`);
			toastService.addToast(
				'Nursing complete time marked',
				StatusColorEnum.SUCCESS
			);
			await fetchNursingComplete({ force: true });
		} catch (error) {
			console.error('Failed to mark nursing complete', error);
			toastService.addToast(
				'Failed to mark complete',
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleCompleteNextBatch() {
		if (!visitId || !hospitalId || nursingIncompleteCount === 0)
			return;
		isBatchCompleting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/nursing-complete`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'nursingComplete.markBatch',
						visitId,
						batchSize: pageSizeNumber,
						statusId: statusFilterDetailStatusId()
					})
				}
			);
			if (!res.ok) throw new Error(`Batch failed (${res.status})`);
			const { markedCount, remainingIncompleteCount } =
				await res.json();
			if (markedCount === 0) {
				toastService.addToast(
					'No lines could be marked complete.',
					StatusColorEnum.WARNING
				);
			} else if (remainingIncompleteCount > 0) {
				toastService.addToast(
					`Marked ${markedCount} complete (${remainingIncompleteCount} still incomplete — use Complete next batch again).`,
					StatusColorEnum.SUCCESS
				);
			} else {
				toastService.addToast(
					`Marked ${markedCount} complete. All filtered lines are done.`,
					StatusColorEnum.SUCCESS
				);
			}
			nursingIncompleteCount = remainingIncompleteCount;
			await fetchNursingComplete({ force: true });
		} catch (error) {
			console.error('Failed batch nursing complete', error);
			toastService.addToast(
				'Failed to complete batch',
				StatusColorEnum.ERROR
			);
		} finally {
			isBatchCompleting = false;
		}
	}
</script>

<div class="relative flex flex-col gap-4">
	{#if isPrinting}
		<div
			class="print-loading-overlay"
			role="status"
			aria-live="polite"
			aria-label="Preparing print and save"
		>
			<div class="flex flex-col items-center gap-4">
				<DaisyUiLoading className="d-loading-lg text-primary" />
				<span class="text-sm font-medium"
					>Preparing print and PDF…</span
				>
			</div>
		</div>
	{/if}
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to view nursing complete items.'}
			className="z-0"
		/>
	{:else if !visit && !isLoading}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<DaisyUiCard>
			<div class="p-3">
				{#if !visit}
					<DaisyUiAlert
						type={StatusColorEnum.WARNING}
						message="Visit not found."
					/>
				{:else}
					<div
						class="mb-3 flex flex-wrap items-center justify-between gap-3"
					>
						<div>
							<h2 class="text-lg font-semibold">Nursing Complete</h2>
							<p class="text-sm text-base-content/70">
								Service items and charges for this visit
								{visit.visitNo ? `(Visit: ${visit.visitNo})` : ''}
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<span class="rounded bg-base-200 px-2 py-1"
								>Subtotal: {formatMoneyAmount(subtotal)}</span
							>
							<span class="rounded bg-base-200 px-2 py-1"
								>Tax: {formatMoneyAmount(totalTax)}</span
							>
							<span
								class="rounded bg-primary/20 px-2 py-1 font-semibold"
								>Grand Total: {formatMoneyAmount(grandTotal)}</span
							>
							<DaisyUiButton
								className="d-btn-outline d-btn-sm"
								onClick={printNursingComplete}
								disabled={!canPrintNursing}
							>
								<LucidePrinter className="mr-1 size-4" />
								Print
							</DaisyUiButton>
							{#if nursingIncompleteCount > 1}
								<DaisyUiButton
									className="d-btn-primary d-btn-sm"
									onClick={handleCompleteNextBatch}
									disabled={!canCompleteNextBatch}
								>
									<LucideCircleCheck className="mr-1 size-4" />
									Complete next batch (up to {pageSizeNumber})
								</DaisyUiButton>
							{/if}
						</div>
					</div>

					{#if rows.length === 0 && !isLoading}
						<DaisyUiAlert
							type={StatusColorEnum.INFO}
							message="No service items found for this visit yet."
						/>
					{:else}
						<div class="{TableEnum.HEIGHT} flex flex-col gap-3">
							<MariTable
								{rows}
								{columns}
								{isLoading}
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
								columnFilters={tableFilters}
								useRemoteFilters={true}
								on:refresh={() =>
									fetchNursingComplete({ force: true })}
								on:pageSizeChange={() => {
									if (!initialized) return;
									currentPage = 1;
									fetchNursingComplete();
								}}
								on:pageChange={() => {
									if (!initialized) return;
									fetchNursingComplete();
								}}
								on:filtersChange={(event) => {
									if (filterDebounceTimeout) {
										clearTimeout(filterDebounceTimeout);
									}
									tableFilters = event.detail.filters;
									if (!initialized) return;
									currentPage = 1;
									filterDebounceTimeout = setTimeout(() => {
										fetchNursingComplete();
									}, 350);
								}}
							>
								{#snippet rowActions(row, rowIndex)}
									{@const typedRow = row as NursingCompleteRow}
									<td class="w-36 min-w-[9rem]">
										{#if typedRow.nursingCompleteTime}
											<span class="d-badge d-badge-sm d-badge-success"
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
								{/snippet}
							</MariTable>
						</div>
					{/if}
				{/if}
			</div>
		</DaisyUiCard>
	{/if}
</div>

<style>
	.print-loading-overlay {
		position: fixed;
		inset: 0;
		z-index: 9990;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
	}
</style>
