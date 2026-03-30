<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import type {
		PatientVisitWithRelations
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import { remoteInvoke } from '$lib/api/remote-invoke-client';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	let datetimeUtil = new DateTimeUtil();

	type VisitTableRow = {
		id: number;
		visitId: number;
		visitNo: string;
		visitDateLabel: string;
		doctorName: string;
		primaryDiagnosis: string;
		diagnosisCellClass: string;
		patientDisplayName: string;
		patientCode: string;
		patientDobLabel: string;
		hospitalName: string;
		branchName: string;
	};

	type LabOrderRow = {
		id: number;
		title: string;
		subtitle: string;
		accent: 'primary' | 'secondary' | 'accent' | 'info';
		date: string;
	};

	let { moduleKey = 'nursing' } = $props<{
		moduleKey?: 'nursing' | 'observation' | string;
	}>();

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	let mounted = $state(false);

	const PATIENT_VISIT_MODULE =
		'table/information-table/patient-visit.remote.ts';
	const SERVICE_ORDER_DETAIL_MODULE =
		'table/information-table/service-order-detail.remote.ts';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);

	let visitRow = $state<PatientVisitWithRelations | null>(null);
	let tableRows = $state<VisitTableRow[]>([]);
	let labOrderResults = $state<LabOrderRow[]>([]);
	let isLoading = $state(false);
	let loadError = $state('');
	let lastLoadedVisitId = $state<number | null>(null);

	const moduleLabel = $derived(
		moduleKey === 'observation' ? 'Observation' : 'Nursing Workbench'
	);

	const totalVisits = $derived(tableRows.length);

	function formatVisitDate(
		value: string | Date | null | undefined
	): string {
		if (value == null) return '—';
		try {
			const d = typeof value === 'string' ? new Date(value) : value;
			if (Number.isNaN(d.getTime())) return '—';
			return d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return '—';
		}
	}

	function truncate(text: string, max: number): string {
		const t = text.trim();
		if (!t) return '';
		return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
	}

	function primaryDiagnosisLabel(
		v: PatientVisitWithRelations
	): string {
		const notes = v.diagnosisNotes?.trim();
		if (notes) return truncate(notes, 42) || '—';
		return v.visitType?.name ?? '—';
	}

	function diagnosisCellTint(label: string): string {
		const t = label.toLowerCase();
		if (
			t.includes('routine') ||
			t.includes('physical') ||
			t.includes('check')
		)
			return 'bg-info/10';
		if (
			t.includes('acute') ||
			t.includes('bronch') ||
			t.includes('infection') ||
			t.includes('fever')
		)
			return 'bg-error/10';
		if (t.includes('follow') || t.includes('review'))
			return 'bg-warning/10';
		return '';
	}

	const visitHistoryColumns: MariTableColumn<VisitTableRow>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-48',
			filterable: false,
			field: 'visitNo'
		},
		{
			id: 'visitDateLabel',
			header: 'Visit Date',
			widthClass: 'w-48',
			filterable: false,
			field: 'visitDateLabel'
		},
		{
			id: 'doctorName',
			header: 'Doctor Name',
			widthClass: 'min-w-[10rem]',
			filterable: false,
			field: 'doctorName',
			cellClass: 'text-primary font-medium'
		},
		{
			id: 'primaryDiagnosis',
			header: 'Primary Diagnosis',
			widthClass: 'min-w-[12rem] max-w-[18rem]',
			filterable: false,
			format: (_v, row) => row.primaryDiagnosis,
			cellClassGetter: (row) => row.diagnosisCellClass
		}
	];

	let visitPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let visitCurrentPage = $state(1);

	function labAccentFromIndex(i: number): LabOrderRow['accent'] {
		const cycle: LabOrderRow['accent'][] = [
			'primary',
			'info',
			'accent',
			'secondary'
		];
		return cycle[i % cycle.length];
	}

	function labBorderClass(accent: LabOrderRow['accent']): string {
		switch (accent) {
			case 'primary':
				return 'border-l-primary';
			case 'info':
				return 'border-l-info';
			case 'accent':
				return 'border-l-accent';
			default:
				return 'border-l-secondary';
		}
	}

	async function loadSidebarOrders(visitIdValue: number) {
		try {
			const orders = await remoteInvoke<any[]>({
				module: SERVICE_ORDER_DETAIL_MODULE,
				fn: 'getServiceOrderDetailRowsForVisit',
				args: [{ visitId: visitIdValue }]
			});
			labOrderResults = orders.map((row: any, i: number) => {
				const service =
					row.serviceName ?? `Service ${row.serviceId ?? ''}`;
				const amount =
					row.serviceAmount != null ? String(row.serviceAmount) : '';
				const unit =
					row.serviceUnit != null ? String(row.serviceUnit) : '';
				const subtitle = [
					amount && unit ? `${amount} × ${unit}` : amount
				]
					.filter(Boolean)
					.join(' ');
				const date = datetimeUtil.formatDateTime(row.createdAt);
				return {
					id: row.id,
					title: service,
					subtitle:
						subtitle || row.instruction?.trim() || 'Order line',
					accent: labAccentFromIndex(i),
					date: date
				} satisfies LabOrderRow;
			});
		} catch {
			labOrderResults = [];
		}
	}

	async function loadDashboard(visitIdValue: number) {
		isLoading = true;
		loadError = '';
		try {
			const selectedVisit = await remoteInvoke<
				PatientVisitWithRelations | null
			>({
				module: PATIENT_VISIT_MODULE,
				fn: 'getPatientVisitByIdWithRelations',
				args: [{ id: visitIdValue }]
			});
			visitRow = selectedVisit;

			if (!selectedVisit) {
				tableRows = [];
				labOrderResults = [];
				return;
			}

			const allVisits = await remoteInvoke<PatientVisitWithRelations[]>({
				module: PATIENT_VISIT_MODULE,
				fn: 'getPatientVisitWithRelations',
				args: []
			});

			const patientVisits = allVisits
				.filter(
					(row) =>
						row.patientId === selectedVisit.patientId &&
						row.hospitalId === selectedVisit.hospitalId
				)
				.sort(
					(a, b) =>
						new Date(b.createdAt ?? 0).getTime() -
						new Date(a.createdAt ?? 0).getTime()
				);

			tableRows = patientVisits.map((v) => {
				const diag = primaryDiagnosisLabel(v);
				const patientDisplayName = v.patient
					? StringUtil.patientDisplayName(v.patient as any)
					: '—';
				const patientCode = v.patient?.code?.trim()
					? v.patient.code.trim()
					: '—';
				const patientDobLabel = datetimeUtil.formatDate(
					v.patient?.dateOfBirth as Date | string | null | undefined
				);
				return {
					id: v.id,
					visitId: v.id,
					visitNo: v.visitNo?.trim()
						? v.visitNo.trim()
						: String(v.id),
					visitDateLabel: datetimeUtil.formatDateTime(v.createdAt),
					doctorName: StringUtil.doctorOptionDisplayName(
						v.doctor as any
					),
					primaryDiagnosis: diag,
					diagnosisCellClass: diagnosisCellTint(diag),
					patientDisplayName:
						patientDisplayName?.trim() || '—',
					patientCode,
					patientDobLabel,
					hospitalName: v.hospital?.name?.trim() || '—',
					branchName: v.branch?.name?.trim() || '—'
				} satisfies VisitTableRow;
			});

			visitCurrentPage = 1;

			await loadSidebarOrders(visitIdValue);
		} catch (err) {
			loadError =
				err instanceof Error
					? err.message
					: 'Failed to load dashboard.';
		} finally {
			isLoading = false;
		}
	}

	function selectVisit(row: VisitTableRow) {
		const base = page.url.pathname;
		const search = new URLSearchParams(page.url.search);
		search.set('visitId', String(row.visitId));
		const url = search.toString() ? `${base}?${search}` : base;
		VisitState.visitId = String(row.visitId);
		routerUtil.replaceRoute(url);
	}

	function escapeHtml(value: unknown): string {
		return String(value ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function visitLabelBarcodeValue(row: VisitTableRow): string {
		const no = row.visitNo.trim();
		if (no && /^[\x20-\x7F]+$/.test(no)) return no;
		return `V-${row.visitId}`;
	}

	async function printVisitLabel(row: VisitTableRow) {
		const { default: JsBarcode } = await import('jsbarcode');

		const title = m.visit_history_visit_label_document_title();
		const heading = m.visit_history_visit_label_heading();
		const printed = m.visit_history_visit_label_printed();
		const printedAt = `${printed}: ${new Date().toLocaleString()}`;

		const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: 100mm 60mm; margin: 4mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111827; font-size: 11px; }
      .header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 6px; }
      .logo { width: 72px; height: auto; max-height: 28px; object-fit: contain; }
      h1 { margin: 0; font-size: 13px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      td { padding: 3px 0; vertical-align: top; }
      td.k { width: 34%; font-weight: 600; color: #374151; padding-right: 6px; }
      .barcode-wrap { margin-top: 6px; display: flex; justify-content: center; }
      svg#visit-label-barcode { max-width: 100%; height: auto; }
      .foot { margin-top: 4px; font-size: 8px; color: #6b7280; text-align: right; }
    </style>
  </head>
  <body>
    <div class="header">
      <img class="logo" src="${escapeHtml(HekaLogo)}" alt="" />
      <h1>${escapeHtml(heading)}</h1>
    </div>
    <table>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_patient())}</td><td>${escapeHtml(row.patientDisplayName)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_patient_code())}</td><td>${escapeHtml(row.patientCode)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_dob())}</td><td>${escapeHtml(row.patientDobLabel)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_visit_no())}</td><td>${escapeHtml(row.visitNo)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_visit_date())}</td><td>${escapeHtml(row.visitDateLabel)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_doctor())}</td><td>${escapeHtml(row.doctorName)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_branch())}</td><td>${escapeHtml(row.branchName)}</td></tr>
      <tr><td class="k">${escapeHtml(m.visit_history_visit_label_hospital())}</td><td>${escapeHtml(row.hospitalName)}</td></tr>
    </table>
    <div class="barcode-wrap"><svg id="visit-label-barcode"></svg></div>
    <div class="foot">${escapeHtml(printedAt)}</div>
  </body>
</html>`;

		let iframe = document.getElementById(
			'visit-label-print-iframe'
		) as HTMLIFrameElement | null;

		if (!iframe) {
			iframe = document.createElement('iframe');
			iframe.id = 'visit-label-print-iframe';
			iframe.style.position = 'fixed';
			iframe.style.right = '0';
			iframe.style.bottom = '0';
			iframe.style.width = '0';
			iframe.style.height = '0';
			iframe.style.border = '0';
			iframe.style.opacity = '0';
			iframe.style.pointerEvents = 'none';
			document.body.appendChild(iframe);
		}

		const win = iframe.contentWindow;
		const doc = win?.document;
		if (!win || !doc) return;

		doc.open();
		doc.write(html);
		doc.close();

		const svg = doc.getElementById('visit-label-barcode');
		if (svg) {
			const payload = visitLabelBarcodeValue(row);
			try {
				JsBarcode(svg, payload, {
					format: 'CODE128',
					width: 1.25,
					height: 40,
					displayValue: true,
					fontSize: 10,
					margin: 2
				});
			} catch {
				try {
					JsBarcode(svg, `V-${row.visitId}`, {
						format: 'CODE128',
						width: 1.25,
						height: 40,
						displayValue: true,
						fontSize: 10,
						margin: 2
					});
				} catch {
					// ignore barcode failure
				}
			}
		}

		window.setTimeout(() => {
			try {
				win.focus();
				win.print();
			} catch {
				// ignore
			}
		}, 200);
	}

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	$effect(() => {
		if (!mounted) return;
		if (!visitId) {
			lastLoadedVisitId = null;
			visitRow = null;
			tableRows = [];
			labOrderResults = [];
			loadError = '';
			return;
		}
		if (lastLoadedVisitId === visitId) return;
		lastLoadedVisitId = visitId;
		void loadDashboard(visitId);
	});
</script>

<div class="visit-dashboard-root">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={m.observation_emr_choose_visit()}
			className="z-0 border-l-4 border-info shadow-sm"
		/>
	{:else if isLoading && !visitRow}
		<div class="flex min-h-64 items-center justify-center">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else if loadError}
		<DaisyUiAlert
			type={StatusColorEnum.ERROR}
			message={loadError}
			className="z-0 border-l-4 border-error shadow-sm"
		/>
	{:else if !visitRow}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message={m.observation_emr_visit_not_found()}
			className="z-0 border-l-4 border-warning shadow-sm"
		/>
	{:else}
		<div
			class="dashboard-grid grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
		>
			<!-- Main column -->
			<div class="flex min-h-0 min-w-0 flex-col gap-6 lg:col-span-8">
				<!-- Visit History -->
				<section
					class="d-card min-w-0 overflow-hidden border border-base-300 bg-base-100 shadow-sm"
				>
					<div
						class="d-card-body flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden p-4 sm:p-5"
					>
						<div
							class="flex flex-wrap items-center justify-between gap-3"
						>
							<div class="flex items-center gap-2">
								<span class="text-primary" aria-hidden="true">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</span>
								<h3 class="text-base font-semibold">Visit History</h3>
							</div>
						</div>

						{#if tableRows.length === 0}
							<p class="text-sm text-base-content/60">
								No visits recorded.
							</p>
						{:else}
							<div
								class="visit-history-table-host flex max-h-[min(55vh,32rem)] min-h-0 min-w-0 flex-1 flex-col"
							>
								<MariTable
									rows={tableRows}
									columns={visitHistoryColumns}
									bind:pageSize={visitPageSizeStr}
									bind:currentPage={visitCurrentPage}
									totalRowCount={tableRows.length}
									{isLoading}
									showRefreshButton={true}
									refreshTooltip="Refresh visits"
									emptyMessage="No visits recorded."
									showRowActions={true}
									actionsHeader="Actions"
									actionsVariant="none"
									enableColumnFilters={false}
									fillParent={true}
									rowClassGetter={(row) =>
										row.visitId === visitId ? 'bg-primary/5' : ''}
									on:refresh={() => loadDashboard(visitId)}
									on:rowClick={(e) => selectVisit(e.detail)}
								>
									{#snippet rowActions(row, rowIndex)}
										<div class="flex flex-wrap items-center gap-1">
											<DaisyUiButton
												className="d-btn-ghost d-btn-sm gap-1"
												onClick={() =>
													selectVisit(row as VisitTableRow)}
											>
												View Case Sheet
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													stroke-width="2"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</DaisyUiButton>
											<DaisyUiButton
												className="d-btn-ghost d-btn-sm gap-1"
												onClick={() =>
													void printVisitLabel(
														row as VisitTableRow
													)}
											>
												<LucidePrinter className="size-4" />
												{m.visit_history_print_visit_label()}
											</DaisyUiButton>
										</div>
									{/snippet}
								</MariTable>
							</div>
						{/if}
					</div>
				</section>

				<!-- Clinical Case Sheet (placeholder / example) -->
				<section
					class="d-card min-w-0 border border-base-300 bg-base-100 shadow-sm"
				>
					<div class="d-card-body gap-4 p-4 sm:p-5">
						<div
							class="flex flex-wrap items-start justify-between gap-4 border-b border-base-200 pb-4"
						>
							<div>
								<p
									class="text-xs font-semibold tracking-wide text-base-content/60 uppercase"
								>
									Selected visit record
								</p>
								<h3 class="mt-1 text-lg font-bold">
									Clinical Case Sheet: {visitRow.visitNo?.trim()
										? visitRow.visitNo.trim()
										: String(visitRow.id)}
								</h3>
							</div>
							<div class="text-end text-sm text-base-content/70">
								<div>
									{datetimeUtil.formatDateTime(visitRow.createdAt)}
								</div>
								<div class="font-medium text-primary">
									{StringUtil.doctorOptionDisplayName(
										visitRow.doctor as any
									)}
								</div>
							</div>
						</div>

						<div
							class="rounded-box border border-dashed border-warning/40 bg-warning/5 p-3 text-sm text-base-content/80"
						>
							<strong class="text-warning">Example only</strong> — Case
							sheet is not wired yet. Below is sample content for layout
							preview.
						</div>

						<div class="space-y-4">
							<div>
								<h4
									class="mb-2 flex items-center gap-2 text-sm font-semibold"
								>
									<span class="text-primary" aria-hidden="true">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
									</span>
									Clinical Notes
								</h4>
								<div
									class="rounded-box bg-base-200/50 p-3 text-sm leading-relaxed"
								>
									Patient presents with persistent cough and mild
									fever. History reviewed; vitals stable. Plan
									discussed with patient. <em>(Sample text.)</em>
								</div>
							</div>

							<div>
								<h4
									class="mb-2 flex items-center gap-2 text-sm font-semibold"
								>
									<span class="text-primary" aria-hidden="true">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
											/>
										</svg>
									</span>
									Symptoms
								</h4>
								<div class="flex flex-wrap gap-2">
									<span
										class="d-badge gap-1 d-badge-outline border-error/30 bg-error/5"
									>
										<span class="h-2 w-2 rounded-full bg-error"
										></span>
										Persistent cough
									</span>
									<span
										class="d-badge gap-1 d-badge-outline border-error/30 bg-error/5"
									>
										<span class="h-2 w-2 rounded-full bg-error"
										></span>
										Fatigue
									</span>
								</div>
							</div>

							<div>
								<h4 class="mb-2 text-sm font-semibold">
									Examination Findings
								</h4>
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<div class="rounded-box bg-base-200/40 p-3">
										<p
											class="text-[10px] font-semibold tracking-wide text-base-content/70 uppercase"
										>
											Respiratory
										</p>
										<p class="mt-1 text-xs sm:text-sm">
											Clear to auscultation bilaterally. <em
												>(Sample.)</em
											>
										</p>
									</div>
									<div class="rounded-box bg-base-200/40 p-3">
										<p
											class="text-[10px] font-semibold tracking-wide text-base-content/70 uppercase"
										>
											Cardiovascular
										</p>
										<p class="mt-1 text-xs sm:text-sm">
											Regular rate and rhythm. <em>(Sample.)</em>
										</p>
									</div>
									<div class="rounded-box bg-base-200/40 p-3">
										<p
											class="text-[10px] font-semibold tracking-wide text-base-content/70 uppercase"
										>
											General
										</p>
										<p class="mt-1 text-xs sm:text-sm">
											Alert, no acute distress. <em>(Sample.)</em>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>

			<!-- Sidebar -->
			<div class="flex min-w-0 flex-col gap-6 lg:col-span-4">
				<!-- Current Prescription (example — no API yet) -->
				<section
					class="d-card border border-base-300 bg-base-100 shadow-sm"
				>
					<div class="d-card-body gap-4 p-4 sm:p-5">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2">
								<span class="text-primary" aria-hidden="true">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
										/>
									</svg>
								</span>
								<h3 class="text-base font-semibold">
									Current Prescription
								</h3>
							</div>
							<span class="d-badge d-badge-sm d-badge-success"
								>Active plan</span
							>
						</div>

						<div
							class="rounded-box border border-base-200 bg-base-200/30 p-3 text-xs text-base-content/70"
						>
							Example medications — connect to prescription when
							available.
						</div>

						<ul class="flex flex-col gap-3">
							<li
								class="flex gap-3 rounded-box border border-base-200 bg-base-100 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
										/>
									</svg>
								</div>
								<div class="min-w-0">
									<p class="font-semibold">Amoxicillin 500mg</p>
									<p class="text-xs text-base-content/70">
										{`1 capsule · 3× daily · 7 days (sample)`}
									</p>
								</div>
							</li>
							<li
								class="flex gap-3 rounded-box border border-base-200 bg-base-100 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
										/>
									</svg>
								</div>
								<div class="min-w-0">
									<p class="font-semibold">Paracetamol 500mg</p>
									<p class="text-xs text-base-content/70">
										{`As needed for fever (sample)`}
									</p>
								</div>
							</li>
						</ul>

						<div>
							<p
								class="mb-1 text-xs font-medium text-base-content/60"
							>
								Special instructions
							</p>
							<div
								class="rounded-box border border-base-200 bg-base-200/30 p-3 text-sm text-base-content/80"
							>
								Take with food. Complete full course. <em
									>(Sample.)</em
								>
							</div>
						</div>

						<button
							type="button"
							class="d-btn w-full gap-2 d-btn-outline"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
								/>
							</svg>
							Print full prescription
						</button>
					</div>
				</section>

				<!-- Lab / Order Results -->
				<section
					class="d-card border border-base-300 bg-base-100 shadow-sm"
				>
					<div class="d-card-body gap-4 p-4 sm:p-5">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<span class="text-primary" aria-hidden="true">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
								</span>
								<h3 class="text-base font-semibold">Orders</h3>
							</div>
						</div>

						{#if labOrderResults.length === 0}
							<p class="text-sm text-base-content/60">
								No order lines for this visit.
							</p>
						{:else}
							<ul class="flex flex-col gap-2">
								{#each labOrderResults as lab (lab.id)}
									<li
										class="flex items-center justify-between gap-3 rounded-box border border-base-200 bg-base-100 py-3 pr-3 pl-4 {labBorderClass(
											lab.accent
										)}"
									>
										<div class="min-w-0">
											<p class="truncate font-medium">{lab.title}</p>
											<p class="text-xs text-base-content/70">
												{lab.subtitle}
											</p>
										</div>
										<div class="min-w-0">
											<p class="text-xs text-base-content/70">
												{lab.date}
											</p>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</section>
			</div>
		</div>
	{/if}
</div>

<style>
	.visit-dashboard-root {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 1.5rem;
	}

	.dashboard-grid {
		min-width: 0;
	}
</style>
