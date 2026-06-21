<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import type {
		PatientVisitWithRelationsLite,
		VisitDashboardDiagnosisRow,
		VisitDashboardFormEntryRow,
		VisitDashboardMedicationLineRow,
		VisitDashboardPayload,
		VisitDashboardPrescriptionNoteRow
	} from '$lib/model/type/visit-dashboard.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		formatIntegerDisplay,
		formatNumberDisplay
	} from '$lib/util/number-display.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import { printFromDocumentMaster } from '$lib/util/document-master-print.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';

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

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	let mounted = $state(false);

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(page.params.hospital_id ?? '');

	let visitRow = $state<PatientVisitWithRelationsLite | null>(null);
	let tableRows = $state<VisitTableRow[]>([]);
	let labOrderResults = $state<LabOrderRow[]>([]);
	let chiefComplaintEntries = $state<VisitDashboardFormEntryRow[]>([]);
	let patientConditionEntries = $state<VisitDashboardFormEntryRow[]>(
		[]
	);
	let visitDiagnoses = $state<VisitDashboardDiagnosisRow[]>([]);
	let vitalSymptoms = $state<string[]>([]);
	let prescriptionNotes = $state<VisitDashboardPrescriptionNoteRow[]>(
		[]
	);
	let medicationLines = $state<VisitDashboardMedicationLineRow[]>([]);
	let isLoading = $state(false);
	let loadError = $state('');
	let lastLoadedVisitId = $state<number | null>(null);
	let loadSeq = 0;

	const hasPrescriptionData = $derived(
		medicationLines.length > 0 || prescriptionNotes.length > 0
	);


	function truncate(text: string, max: number): string {
		const t = text.trim();
		if (!t) return '';
		return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
	}

	function primaryDiagnosisLabel(
		v: PatientVisitWithRelationsLite
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
			widthClass: TableRowEnum.VISIT_NO_WIDTH,
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

	function formatText(value: string | null | undefined): string {
		const t = value?.trim();
		return t ? t : '—';
	}

	function medicationLineSubtitle(
		line: VisitDashboardMedicationLineRow
	): string {
		const doseParts = [
			line.dose?.trim(),
			line.doseUnitName?.trim()
		].filter(Boolean);
		const durationParts = [
			line.durationValue?.trim(),
			line.durationUnitName?.trim()
		].filter(Boolean);
		const parts = [
			doseParts.length ? doseParts.join(' ') : '',
			line.frequencyLabel?.trim() ?? '',
			durationParts.length ? durationParts.join(' ') : '',
			line.foodRelationName?.trim() ?? '',
			line.lineRemarks?.trim() ?? ''
		].filter(Boolean);
		return parts.join(' · ') || '—';
	}

	function goToPrescriptionPage() {
		if (!hospitalId || !visitId) return;
		const path = `/heka/hospital/${hospitalId}/home/consultation/cpoe/prescription?visitId=${visitId}`;
		routerUtil.goToRoute(path);
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

	function parseApiErrorMessage(text: string, status: number): string {
		const trimmed = text.trim();
		if (!trimmed) return resStatusFallback(status);
		try {
			const parsed = JSON.parse(trimmed) as { message?: string };
			if (parsed.message?.trim()) return parsed.message.trim();
		} catch {
			// plain text body from SvelteKit error()
		}
		if (trimmed.length <= 200 && !trimmed.startsWith('<')) {
			return trimmed;
		}
		return resStatusFallback(status);
	}

	function resStatusFallback(status: number): string {
		if (status === 404) return m.observation_emr_visit_not_found();
		return `Request failed (${status})`;
	}

	async function apiFetch<T>(url: string): Promise<T> {
		const res = await fetch(url);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(parseApiErrorMessage(text, res.status));
		}
		return (await res.json()) as T;
	}

	function dashboardApiUrl(visitIdValue: number): string {
		return `/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/patient-visit-history-dashboard?visitId=${visitIdValue}`;
	}

	async function loadDashboard(visitIdValue: number) {
		const seq = ++loadSeq;
		isLoading = true;
		loadError = '';
		try {
			if (!hospitalId) throw new Error('Missing hospital context');

			const payload = await apiFetch<VisitDashboardPayload>(
				dashboardApiUrl(visitIdValue)
			);
			if (seq !== loadSeq || visitIdValue !== visitId) return;

			if (!payload.selectedVisit) {
				loadError = m.observation_emr_visit_not_found();
				return;
			}

			visitRow = payload.selectedVisit;
			chiefComplaintEntries = payload.chiefComplaintEntries ?? [];
			patientConditionEntries = payload.patientConditionEntries ?? [];
			visitDiagnoses = payload.visitDiagnoses ?? [];
			vitalSymptoms = payload.vitalSymptoms ?? [];
			prescriptionNotes = payload.prescriptionNotes ?? [];
			medicationLines = payload.medicationLines ?? [];

			const patientVisits = payload.patientVisits;

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
					patientDisplayName: patientDisplayName?.trim() || '—',
					patientCode,
					patientDobLabel,
					hospitalName: v.hospital?.name?.trim() || '—',
					branchName: v.branch?.name?.trim() || '—'
				} satisfies VisitTableRow;
			});

			visitCurrentPage = 1;

			labOrderResults = payload.orderLines.map((row, i) => {
				const service =
					row.serviceName ?? `Service ${row.serviceId ?? ''}`;
				const amount =
					row.serviceAmount != null
						? formatNumberDisplay(row.serviceAmount)
						: '';
				const unit =
					row.serviceUnit != null
						? formatIntegerDisplay(row.serviceUnit)
						: '';
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
		} catch (err) {
			if (seq !== loadSeq || visitIdValue !== visitId) return;
			loadError =
				err instanceof Error
					? err.message
					: 'Failed to load dashboard.';
		} finally {
			if (seq === loadSeq) isLoading = false;
		}
	}

	function selectVisit(row: VisitTableRow) {
		const base = page.url.pathname;
		const search = new URLSearchParams(page.url.search);
		search.set('visitId', String(row.visitId));
		const url = search.toString() ? `${base}?${search}` : base;
		routerUtil.replaceRoute(url);
		VisitState.visitId = String(row.visitId);
	}

	function goToCaseSheet(row: VisitTableRow) {
		const vid = row.visitId;
		if (!vid || !hospitalId) {
			selectVisit(row);
			return;
		}

		const query = `?visitId=${vid}`;
		const path = `/heka/hospital/${hospitalId}/home/nursing-workbench/emr/case-sheet${query}`;

		VisitState.visitId = String(vid);
		routerUtil.goToRoute(path);
	}

	function visitLabelBarcodeValue(row: VisitTableRow): string {
		const no = row.visitNo.trim();
		if (no && /^[\x20-\x7F]+$/.test(no)) return no;
		return `V-${row.visitId}`;
	}

	async function printVisitLabel(row: VisitTableRow) {
		if (!hospitalId) return;
		const printed = m.visit_history_visit_label_printed();
		const printedAt = `${printed}: ${new Date().toLocaleString()}`;
		const payload = visitLabelBarcodeValue(row);

		await printFromDocumentMaster({
			hospitalId,
			documentCode: DOCUMENT_PRINT_CODE.VISIT_LABEL,
			extraPlaceholders: {
				'{{patient.name}}': row.patientDisplayName,
				'{{patient.code}}': row.patientCode,
				'{{patient.dob}}': row.patientDobLabel,
				'{{visit.no}}': row.visitNo,
				'{{visit.date}}': row.visitDateLabel,
				'{{doctor.name}}': row.doctorName,
				'{{hospital.logo}}': HekaLogo,
				'{{print.datetime}}': printedAt,
				'{{print.label_heading}}': m.visit_history_visit_label_heading(),
				'{{print.label_patient}}': m.visit_history_visit_label_patient(),
				'{{print.label_dob}}': m.visit_history_visit_label_dob(),
				'{{print.label_patient_code}}':
					m.visit_history_visit_label_patient_code(),
				'{{print.label_doctor}}': m.visit_history_visit_label_doctor(),
				'{{print.label_visit_no}}': m.visit_history_visit_label_visit_no(),
				'{{print.label_visit_date}}':
					m.visit_history_visit_label_visit_date()
			},
			iframeId: 'visit-label-print-iframe',
			onIframeReady: async (doc) => {
				const svg = doc.getElementById('visit-label-barcode');
				if (!svg) return;
				const { default: JsBarcode } = await import('jsbarcode');
				try {
					JsBarcode(svg, payload, {
						format: 'CODE128',
						width: 1.25,
						height: 40,
						displayValue: true,
						fontSize: 9,
						margin: 2
					});
				} catch {
					JsBarcode(svg, `V-${row.visitId}`, {
						format: 'CODE128',
						width: 1.25,
						height: 40,
						displayValue: true,
						fontSize: 9,
						margin: 2
					});
				}
			}
		});
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
			chiefComplaintEntries = [];
			patientConditionEntries = [];
			visitDiagnoses = [];
			vitalSymptoms = [];
			prescriptionNotes = [];
			medicationLines = [];
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
	{:else if loadError}
		<DaisyUiAlert
			type={StatusColorEnum.ERROR}
			message={loadError}
			className="z-0 border-l-4 border-error shadow-sm"
		/>
	{:else if !visitRow && !isLoading}
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
								{m.nursing_case_sheet_no_entries()}
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
									emptyMessage={m.nursing_case_sheet_no_entries()}
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
										<div class="flex items-center gap-1">
											<DaisyUiTooltip
												tooltipText="Open case sheet"
												className="d-tooltip-right"
											>
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm d-btn-square"
													onClick={() =>
														goToCaseSheet(row as VisitTableRow)}
												>
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
											</DaisyUiTooltip>
											<DaisyUiTooltip
												tooltipText={m.visit_history_print_visit_label()}
												className="d-tooltip-right"
											>
												<DaisyUiButton
													className="d-btn-ghost d-btn-sm d-btn-square"
													onClick={() =>
														void printVisitLabel(
															row as VisitTableRow
														)}
												>
													<LucidePrinter className="size-4" />
												</DaisyUiButton>
											</DaisyUiTooltip>
										</div>
									{/snippet}
								</MariTable>
							</div>
						{/if}
					</div>
				</section>

				<!-- Clinical Case Sheet -->
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
									{m.nursing_case_sheet_title()}
								</p>
								<h3 class="mt-1 text-lg font-bold">
									{visitRow
										? visitRow.visitNo?.trim()
											? visitRow.visitNo.trim()
											: String(visitRow.id)
										: isLoading
											? '…'
											: '—'}
								</h3>
							</div>
							<div class="text-end text-sm text-base-content/70">
								<div>
									{#if visitRow}
										{datetimeUtil.formatDateTime(visitRow.createdAt)}
									{:else}
										—
									{/if}
								</div>
								<div class="font-medium text-primary">
									{#if visitRow}
										{StringUtil.doctorOptionDisplayName(
											visitRow.doctor as any
										)}
									{:else}
										—
									{/if}
								</div>
							</div>
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
									{m.observation_emr_diagnosis_notes()}
								</h4>
								{#if !visitRow?.diagnosisNotes?.trim() && chiefComplaintEntries.length === 0}
									<p class="text-sm text-base-content/60">
										{m.nursing_case_sheet_no_entries()}
									</p>
								{:else}
									<div
										class="space-y-3 rounded-box bg-base-200/50 p-3 text-sm leading-relaxed"
									>
										{#if visitRow?.diagnosisNotes?.trim()}
											<p class="whitespace-pre-wrap">
												{visitRow.diagnosisNotes.trim()}
											</p>
										{/if}
										{#if chiefComplaintEntries.length > 0}
											<div>
												<p
													class="mb-1 text-xs font-semibold tracking-wide text-base-content/60 uppercase"
												>
													{m.observation_emr_chief_complaint()}
												</p>
												<ul class="list-disc space-y-1 ps-5">
													{#each chiefComplaintEntries as row (row.id)}
														<li>{formatText(row.description)}</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<div>
								<h4
									class="mb-2 flex items-center gap-2 text-sm font-semibold"
								>
									{m.observation_emr_diagnosis()}
								</h4>
								{#if visitDiagnoses.length === 0}
									<p class="text-sm text-base-content/60">
										{m.observation_emr_diagnosis_empty()}
									</p>
								{:else}
									<ul
										class="list-disc space-y-1 rounded-box bg-base-200/50 p-3 ps-8 text-sm"
									>
										{#each visitDiagnoses as row (row.id)}
											<li>
												{formatText(row.description)}
												{#if row.diagnosisTypeName}
													<span class="text-base-content/60">
														({row.diagnosisTypeName})
													</span>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
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
									{m.nursing_case_sheet_col_symptom()}
								</h4>
								{#if vitalSymptoms.length === 0}
									<p class="text-sm text-base-content/60">
										{m.nursing_case_sheet_no_entries()}
									</p>
								{:else}
									<div class="flex flex-wrap gap-2">
										{#each vitalSymptoms as symptom (symptom)}
											<span
												class="d-badge gap-1 d-badge-outline border-error/30 bg-error/5"
											>
												<span
													class="h-2 w-2 rounded-full bg-error"
												></span>
												{symptom}
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<div>
								<h4 class="mb-2 text-sm font-semibold">
									{m.observation_emr_patient_condition()}
								</h4>
								{#if patientConditionEntries.length === 0}
									<p class="text-sm text-base-content/60">
										{m.nursing_case_sheet_no_entries()}
									</p>
								{:else}
									<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
										{#each patientConditionEntries as row (row.id)}
											<div class="rounded-box bg-base-200/40 p-3">
												<p class="text-xs sm:text-sm whitespace-pre-wrap">
													{formatText(row.description)}
												</p>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</section>
			</div>

			<!-- Sidebar -->
			<div class="flex min-w-0 flex-col gap-6 lg:col-span-4">
				<!-- Current Prescription -->
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
									{m.consultation_cpoe_prescription_title()}
								</h3>
							</div>
						</div>

						{#if !hasPrescriptionData}
							<p class="text-sm text-base-content/60">
								{m.nursing_case_sheet_no_entries()}
							</p>
						{:else}
							{#if medicationLines.length > 0}
								<ul class="flex flex-col gap-3">
									{#each medicationLines as line (line.id)}
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
												<p class="font-semibold">
													{formatText(line.itemName)}
												</p>
												<p class="text-xs text-base-content/70">
													{medicationLineSubtitle(line)}
												</p>
												{#if line.batchNo?.trim()}
													<p class="text-xs text-base-content/50">
														{line.batchNo.trim()}
													</p>
												{/if}
											</div>
										</li>
									{/each}
								</ul>
							{/if}

							{#if prescriptionNotes.length > 0}
								<div>
									<p
										class="mb-1 text-xs font-medium text-base-content/60"
									>
										{m.consultation_cpoe_prescription_note_label()}
									</p>
									<div
										class="space-y-2 rounded-box border border-base-200 bg-base-200/30 p-3 text-sm text-base-content/80"
									>
										{#each prescriptionNotes as note (note.id)}
											<p class="whitespace-pre-wrap">
												{formatText(note.note)}
											</p>
										{/each}
									</div>
								</div>
							{/if}

							<DaisyUiButton
								className="d-btn-outline w-full gap-2"
								onClick={() => goToPrescriptionPage()}
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
								{m.consultation_cpoe_prescription_title()}
							</DaisyUiButton>
						{/if}
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
								{m.nursing_case_sheet_no_entries()}
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
