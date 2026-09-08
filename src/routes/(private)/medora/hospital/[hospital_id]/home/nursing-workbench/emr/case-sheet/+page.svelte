<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { CaseSheetGetResponse } from '$lib/model/type/medora/case-sheet.type';
	import type {
		PatientDiagnosisListRow,
		ServiceOrderDetailListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import { m } from '$lib/paraglide/messages';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { buildCaseSheetPrintBodyHtml } from '$lib/util/case-sheet-print-body.util';
	import {
		buildPrintHtmlFromDocumentMasterBootstrap,
		fetchDocumentPrintBootstrap,
		printFromDocumentMasterBootstrap
	} from '$lib/util/document-master-print.util.svelte';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	// Refactor note: this page now fetches via mirrored `/api/medora/hospital/.../case-sheet`.
	// Keep lightweight local types to avoid importing removed remote tool layers.
	type PatientVisitWithRelations = any;
	type PatientAllergyWithRelations = any;
	type DiagnosisWithType = any;
	type PatientFormEntryWithRelations = any;

	type OrderDetailVisitRow = ServiceOrderDetailListRow & {
		orderNo: string | null;
		serviceName: string | null;
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

	let visitRow = $state<PatientVisitWithRelations | null>(null);
	let allergies = $state<PatientAllergyWithRelations[]>([]);
	let vitals = $state<PatientDiagnosisListRow[]>([]);
	let orderLines = $state<OrderDetailVisitRow[]>([]);
	let visitDiagnoses = $state<DiagnosisWithType[]>([]);
	let chiefComplaintEntries = $state<PatientFormEntryWithRelations[]>(
		[]
	);
	let patientConditionEntries = $state<
		PatientFormEntryWithRelations[]
	>([]);
	let userDisplayById = $state<Record<string, string>>({});

	let isLoading = $state(false);
	let isPrinting = $state(false);
	let isSaving = $state(false);
	let mounted = $state(false);

	const toastService = new ToastService();

	const printByName = $derived(
		typeof page.data?.printByName === 'string'
			? page.data.printByName
			: ''
	);

	const lifeCycleUtil = new LifeCycleUtil();
	lifeCycleUtil.onMount(() => {
		mounted = true;
	});
	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	function formatVital(value: unknown): string {
		if (value == null || value === '') return '–';
		return String(value);
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

	function getVitalDisplayDate(
		v: PatientDiagnosisListRow
	): string | null {
		return v.vitalDateTime ?? v.createdAt ?? null;
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatUserName(userId: string | null | undefined): string {
		if (!userId) return '–';
		return userDisplayById[userId]?.trim() || '–';
	}

	function vitalStatusLabel(row: PatientDiagnosisListRow): string {
		return row.statusId === StatusEnum.ACTIVE
			? m.nursing_case_sheet_status_active()
			: row.statusId === StatusEnum.INACTIVE
				? m.nursing_case_sheet_status_inactive()
				: `${m.observation_emr_status()} ${row.statusId ?? '–'}`;
	}

	function allergyStatusLabel(
		row: PatientAllergyWithRelations
	): string {
		return row.statusId === StatusEnum.ACTIVE
			? m.nursing_case_sheet_status_active()
			: row.statusId === StatusEnum.INACTIVE
				? m.nursing_case_sheet_status_inactive()
				: `${m.observation_emr_status()} ${row.statusId ?? '–'}`;
	}

	function orderLineStatusLabel(row: OrderDetailVisitRow): string {
		return row.statusId === StatusEnum.ACTIVE
			? m.nursing_case_sheet_status_active()
			: row.statusId === StatusEnum.INACTIVE
				? m.nursing_case_sheet_status_inactive()
				: '–';
	}

	const patientDisplayName = $derived(
		visitRow?.patient
			? StringUtil.patientDisplayName(visitRow.patient)
			: '–'
	);

	async function loadCaseSheet() {
		if (!visitId) {
			visitRow = null;
			allergies = [];
			vitals = [];
			orderLines = [];
			visitDiagnoses = [];
			chiefComplaintEntries = [];
			patientConditionEntries = [];
			userDisplayById = {};
			return;
		}

		isLoading = true;
		visitRow = null;
		allergies = [];
		vitals = [];
		orderLines = [];
		visitDiagnoses = [];
		chiefComplaintEntries = [];
		patientConditionEntries = [];
		userDisplayById = {};
		try {
			if (!hospitalId) {
				visitRow = null;
				return;
			}

			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/case-sheet?visitId=${visitId}`
			);
			if (!res.ok)
				throw new Error(`Failed to load case sheet (${res.status})`);
			const data = (await res.json()) as CaseSheetGetResponse;

			visitRow = data.visitRow ?? null;
			allergies = Array.isArray(data.allergies) ? data.allergies : [];
			vitals = Array.isArray(data.vitals) ? data.vitals : [];
			orderLines = Array.isArray(data.orderLines)
				? data.orderLines
				: [];
			visitDiagnoses = Array.isArray(data.visitDiagnoses)
				? data.visitDiagnoses
				: [];
			chiefComplaintEntries = Array.isArray(
				data.chiefComplaintEntries
			)
				? data.chiefComplaintEntries
				: [];
			patientConditionEntries = Array.isArray(
				data.patientConditionEntries
			)
				? data.patientConditionEntries
				: [];
			userDisplayById = data.userDisplayById ?? {};
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (!mounted) return;
		const id = visitId;
		if (!id) {
			visitRow = null;
			allergies = [];
			vitals = [];
			orderLines = [];
			visitDiagnoses = [];
			chiefComplaintEntries = [];
			patientConditionEntries = [];
			userDisplayById = {};
			return;
		}
		void loadCaseSheet();
	});

	function printCaseSheetLabels() {
		return {
			chiefComplaint: m.observation_emr_chief_complaint(),
			patientCondition: m.observation_emr_patient_condition(),
			diagnosis: m.observation_emr_diagnosis(),
			diagnosisEmpty: m.observation_emr_diagnosis_empty(),
			diagnosisTypeLabel: m.observation_emr_diagnosis_type_label(),
			allergies: m.observation_emr_allergies(),
			allergyEmpty: m.observation_emr_allergy_empty(),
			allergySeverity: m.nursing_case_sheet_allergy_severity(),
			allergyReaction: m.nursing_case_sheet_allergy_reaction(),
			vitals: m.observation_emr_vitals(),
			orderHistory: m.observation_emr_order_history(),
			service: m.observation_emr_service(),
			serviceAmount: m.observation_emr_service_amount(),
			units: m.observation_emr_units(),
			urgent: m.observation_emr_urgent(),
			noEntries: m.nursing_case_sheet_no_entries(),
			yes: m.nursing_case_sheet_yes(),
			no: m.nursing_case_sheet_no(),
			enteredBy: 'Entered by',
			updatedBy: 'Updated by',
			on: 'on',
			vitalColDate: m.nursing_case_sheet_col_date(),
			vitalColHeight: m.nursing_case_sheet_col_height_cm(),
			vitalColWeight: m.nursing_case_sheet_col_weight_kg(),
			vitalColBmi: m.nursing_case_sheet_col_bmi(),
			vitalColBp: m.nursing_case_sheet_col_bp(),
			vitalColPulse: m.nursing_case_sheet_col_pulse(),
			vitalColTemp: m.nursing_case_sheet_col_temp(),
			vitalColSpo2: m.nursing_case_sheet_col_spo2(),
			vitalColSymptom: m.nursing_case_sheet_col_symptom(),
			orderColOrderNo: m.nursing_case_sheet_col_order_no(),
			orderColDescription: m.nursing_case_sheet_col_description()
		};
	}

	function buildCaseSheetPrintOpts() {
		const bodyHtml = buildCaseSheetPrintBodyHtml({
			labels: printCaseSheetLabels(),
			formatters: {
				formatText,
				formatDateTime,
				formatUserName,
				formatVital,
				formatNumberDisplay,
				getVitalDisplayDate
			},
			chiefComplaintEntries,
			patientConditionEntries,
			visitDiagnoses,
			allergies,
			vitals,
			orderLines
		});

		const printedAt = new Date().toLocaleString('en-US', {
			dateStyle: 'short',
			timeStyle: 'short'
		});

		return {
			visit: visitRow,
			printBy: printByName,
			extraPlaceholders: {
				'{{print.body_html}}': bodyHtml,
				'{{print.datetime}}': printedAt,
				'{{print.label_title}}': m.nursing_case_sheet_title(),
				'{{print.label_visit_no}}':
					m.visit_history_visit_label_visit_no(),
				'{{print.label_patient}}':
					m.visit_history_visit_label_patient(),
				'{{print.label_patient_code}}':
					m.visit_history_visit_label_patient_code(),
				'{{print.label_visit_date}}':
					m.visit_history_visit_label_visit_date(),
				'{{print.label_doctor}}': m.visit_history_visit_label_doctor(),
				'{{print.label_generated}}': m.nursing_case_sheet_generated()
			},
			iframeId: 'case-sheet-print-iframe'
		};
	}

	async function printCaseSheet() {
		if (!visitId || !visitRow || !hospitalId) {
			toastService.addToast(
				'Select a visit to print.',
				StatusColorEnum.WARNING
			);
			return;
		}

		isPrinting = true;
		try {
			const bootstrap = await fetchDocumentPrintBootstrap(
				hospitalId,
				DOCUMENT_PRINT_CODE.CASE_SHEET
			);
			if (!bootstrap.document?.documentText) {
				toastService.addToast(
					'Failed to prepare case sheet print. Run DB seed or configure CASE_SHEET_PRINT in Document Master.',
					StatusColorEnum.ERROR
				);
				return;
			}

			await printFromDocumentMasterBootstrap(
				bootstrap,
				buildCaseSheetPrintOpts()
			);
		} catch (err) {
			console.error('Case sheet print failed', err);
			toastService.addToast(
				'Failed to prepare case sheet print. Run DB seed or configure CASE_SHEET_PRINT in Document Master.',
				StatusColorEnum.ERROR
			);
		} finally {
			isPrinting = false;
		}
	}

	async function saveCaseSheet() {
		if (!visitId || !visitRow || !hospitalId) {
			toastService.addToast(
				'Select a visit to save.',
				StatusColorEnum.WARNING
			);
			return;
		}

		const patientId = visitRow?.patient?.id;
		if (!patientId) {
			toastService.addToast(
				'Patient data missing.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSaving = true;
		try {
			const bootstrap = await fetchDocumentPrintBootstrap(
				hospitalId,
				DOCUMENT_PRINT_CODE.CASE_SHEET
			);
			if (!bootstrap.document?.documentText) {
				toastService.addToast(
					'Failed to prepare case sheet. Run DB seed or configure CASE_SHEET_PRINT in Document Master.',
					StatusColorEnum.ERROR
				);
				return;
			}

			const printOpts = buildCaseSheetPrintOpts();
			const htmlPdf = buildPrintHtmlFromDocumentMasterBootstrap(
				bootstrap,
				printOpts,
				'pdfRaster'
			);
			const blob = await htmlStringToPdfBlob(htmlPdf);
			const safeBase =
				`case-sheet-${visitRow.visitNo || visitId}-${Date.now()}`
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
				documentId: bootstrap.document.id,
				fileUrl: url,
				attachmentDescription: `Case sheet (visit ${visitRow.visitNo ?? visitId})`
			});
			toastService.addToast(
				m.nursing_case_sheet_save_success(),
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			console.error('Case sheet save failed', err);
			toastService.addToast(
				m.nursing_case_sheet_save_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="case-sheet-root px-2 py-4 md:px-4">
	<div
		class="no-print mb-4 flex flex-wrap items-center justify-between gap-2"
	>
		<h1 class="text-xl font-semibold text-base-content">
			{m.nursing_case_sheet_title()}
		</h1>
		{#if visitId && visitRow}
			<div class="flex flex-wrap gap-2">
				<WashButton
					type="button"
					className="btn-outline btn-sm gap-2"
					onClick={saveCaseSheet}
					disabled={isSaving || isPrinting}
					loading={isSaving}
				>
					{m.save()}
				</WashButton>
				<WashButton
					type="button"
					className="btn-primary btn-sm gap-2"
					onClick={printCaseSheet}
					disabled={isSaving || isPrinting}
					loading={isPrinting}
				>
					<LucidePrinter className="size-4" />
					{m.nursing_case_sheet_print()}
				</WashButton>
			</div>
		{/if}
	</div>

	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.nursing_case_sheet_choose_visit()}
			className="z-0"
		/>
	{:else if !visitRow && !isLoading}
		<WashAlert
			type={StatusColorEnum.WARNING}
			message={m.observation_emr_visit_not_found()}
			className="z-0"
		/>
	{:else}
		{#if isLoading && !visitRow}
			<div
				class="no-print mb-3 flex items-center gap-2 text-sm text-base-content/70"
				role="status"
				aria-live="polite"
			>
				<span class="loading loading-spinner loading-sm"></span>
				Loading case sheet…
			</div>
		{/if}
		{#if visitRow}
			<article class="case-sheet-document">
				<header class="case-sheet-header">
					<h2 class="case-sheet-doc-title">
						{m.nursing_case_sheet_title()}
					</h2>
					<dl class="case-sheet-meta">
						<div>
							<dt>{m.visit_history_visit_label_visit_no()}</dt>
							<dd>{formatText(visitRow.visitNo)}</dd>
						</div>
						<div>
							<dt>{m.visit_history_visit_label_patient()}</dt>
							<dd>{patientDisplayName}</dd>
						</div>
						{#if visitRow.patient?.code}
							<div>
								<dt>{m.visit_history_visit_label_patient_code()}</dt>
								<dd>{visitRow.patient.code}</dd>
							</div>
						{/if}
						<div>
							<dt>{m.visit_history_visit_label_visit_date()}</dt>
							<dd>{formatDateTime(visitRow.createdAt ?? null)}</dd>
						</div>
					</dl>
				</header>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_chief_complaint()}</h3>
					{#if chiefComplaintEntries.length === 0}
						<p class="case-sheet-empty">
							{m.nursing_case_sheet_no_entries()}
						</p>
					{:else}
						<ol class="case-sheet-list">
							{#each chiefComplaintEntries as row (row.id)}
								<li>
									<div>{formatText(row.description)}</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</li>
							{/each}
						</ol>
					{/if}
				</section>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_patient_condition()}</h3>
					{#if patientConditionEntries.length === 0}
						<p class="case-sheet-empty">
							{m.nursing_case_sheet_no_entries()}
						</p>
					{:else}
						<ol class="case-sheet-list">
							{#each patientConditionEntries as row (row.id)}
								<li>
									<div>{formatText(row.description)}</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</li>
							{/each}
						</ol>
					{/if}
				</section>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_diagnosis()}</h3>
					{#if visitDiagnoses.length === 0}
						<p class="case-sheet-empty">
							{m.observation_emr_diagnosis_empty()}
						</p>
					{:else}
						<ol class="case-sheet-list">
							{#each visitDiagnoses as row (row.id)}
								<li>
									<div>
										{formatText(row.description)}
										{#if row.diagnosisType?.name}
											<span class="case-sheet-muted">
												({m.observation_emr_diagnosis_type_label()}: {row
													.diagnosisType.name})
											</span>
										{/if}
									</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</li>
							{/each}
						</ol>
					{/if}
				</section>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_allergies()}</h3>
					{#if allergies.length === 0}
						<p class="case-sheet-empty">
							{m.observation_emr_allergy_empty()}
						</p>
					{:else}
						<ol class="case-sheet-list">
							{#each allergies as row (row.id)}
								<li>
									<div>
										<strong
											>{formatText(row.allergy?.name ?? null)}</strong
										>
										{m.nursing_case_sheet_allergy_severity()}:
										{formatText(row.severity?.name ?? null)};
										{m.nursing_case_sheet_allergy_reaction()}:
										{formatText(row.reaction)}
									</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</li>
							{/each}
						</ol>
					{/if}
				</section>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_vitals()}</h3>
					{#if vitals.length === 0}
						<p class="case-sheet-empty">
							{m.nursing_case_sheet_no_entries()}
						</p>
					{:else}
						<div class="case-sheet-table-wrap">
							<table class="case-sheet-table">
								<thead>
									<tr>
										<th>{m.nursing_case_sheet_col_date()}</th>
										<th>{m.nursing_case_sheet_col_height_cm()}</th>
										<th>{m.nursing_case_sheet_col_weight_kg()}</th>
										<th>{m.nursing_case_sheet_col_bmi()}</th>
										<th>{m.nursing_case_sheet_col_bp()}</th>
										<th>{m.nursing_case_sheet_col_pulse()}</th>
										<th>{m.nursing_case_sheet_col_temp()}</th>
										<th>{m.nursing_case_sheet_col_spo2()}</th>
										<th>{m.nursing_case_sheet_col_symptom()}</th>
									</tr>
								</thead>
								<tbody>
									{#each vitals as row (row.id)}
										<tr>
											<td
												>{formatDateTime(
													getVitalDisplayDate(row)
												)}</td
											>
											<td>{formatVital(row.height)}</td>
											<td>{formatVital(row.weight)}</td>
											<td>{formatVital(row.bmi)}</td>
											<td
												>{formatVital(row.bpSystolic)}/{formatVital(
													row.bpDiastolic
												)}</td
											>
											<td>{formatVital(row.pulse)}</td>
											<td>{formatVital(row.temperature)}</td>
											<td>{formatVital(row.spO2)}</td>
											<td>
												<div>{formatVital(row.symptom)}</div>
												<p class="case-sheet-audit">
													Entered by {formatUserName(
														row.createdBy as string | null
													)} on
													{formatDateTime(
														row.createdAt as string | null | undefined
													)}
													· Updated by {formatUserName(
														row.updatedBy as string | null
													)} on
													{formatDateTime(
														row.updatedAt as string | null | undefined
													)}
												</p>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>

				<section class="case-sheet-section">
					<h3>{m.observation_emr_order_history()}</h3>
					{#if orderLines.length === 0}
						<p class="case-sheet-empty">
							{m.nursing_case_sheet_no_entries()}
						</p>
					{:else}
						<div class="case-sheet-table-wrap">
							<table class="case-sheet-table">
								<thead>
									<tr>
										<th>{m.nursing_case_sheet_col_order_no()}</th>
										<th>{m.observation_emr_service()}</th>
										<th>{m.nursing_case_sheet_col_description()}</th>
										<th>{m.observation_emr_service_amount()}</th>
										<th>{m.observation_emr_units()}</th>
										<th>{m.observation_emr_urgent()}</th>
									</tr>
								</thead>
								<tbody>
									{#each orderLines as row (row.id)}
										<tr>
											<td>{formatText(row.orderNo)}</td>
											<td>
												{formatText(
													row.serviceName ??
														`Service ${row.serviceId}`
												)}
											</td>
											<td>
												<div>{formatText(row.instruction)}</div>
												<p class="case-sheet-audit">
													Entered by {formatUserName(
														row.createdBy as string | null
													)} on
													{formatDateTime(
														row.createdAt as string | null | undefined
													)}
													· Updated by {formatUserName(
														row.updatedBy as string | null
													)} on
													{formatDateTime(
														row.updatedAt as string | null | undefined
													)}
												</p>
											</td>
											<td>{formatNumberDisplay(row.serviceAmount)}</td
											>
											<td>
												{row.serviceUnit != null
													? String(row.serviceUnit)
													: '–'}
											</td>
											<td>
												{row.isUrgent
													? m.nursing_case_sheet_yes()
													: m.nursing_case_sheet_no()}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>

				<footer class="case-sheet-footer">
					{m.nursing_case_sheet_generated()}:
					{new Date().toLocaleString('en-US', {
						dateStyle: 'short',
						timeStyle: 'short'
					})}
				</footer>
			</article>
		{/if}
	{/if}
</div>

<style>
	.case-sheet-document {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1.75rem 1.5rem 2rem;
		background: var(--fallback-b1, oklch(var(--b1)));
		color: var(--fallback-bc, oklch(var(--bc)));
		border: 1px solid
			color-mix(in oklab, currentColor 12%, transparent);
		border-radius: 0.25rem;
		font-family: 'Georgia', 'Times New Roman', serif;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.case-sheet-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid
			color-mix(in oklab, currentColor 18%, transparent);
	}

	.case-sheet-doc-title {
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0 0 0.75rem;
		letter-spacing: 0.02em;
	}

	.case-sheet-meta {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.65rem 1.25rem;
		margin: 0;
		font-size: 0.88rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.case-sheet-meta dt {
		font-weight: 600;
		color: color-mix(in oklab, currentColor 55%, transparent);
		margin: 0;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.case-sheet-meta dd {
		margin: 0.1rem 0 0;
	}

	.case-sheet-section {
		margin-top: 1.35rem;
		break-inside: avoid;
	}

	.case-sheet-section h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		border-bottom: 1px solid
			color-mix(in oklab, currentColor 14%, transparent);
		padding-bottom: 0.25rem;
	}

	.case-sheet-list {
		margin: 0.35rem 0 0;
		padding-left: 1.35rem;
	}

	.case-sheet-list li {
		margin-bottom: 0.35rem;
	}

	.case-sheet-empty {
		margin: 0.35rem 0 0;
		font-style: italic;
		color: color-mix(in oklab, currentColor 50%, transparent);
	}

	.case-sheet-audit {
		margin-top: 0.4rem;
		font-size: 0.78rem;
		color: color-mix(in oklab, currentColor 55%, transparent);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.case-sheet-muted {
		color: color-mix(in oklab, currentColor 45%, transparent);
		font-size: 0.92em;
	}

	.case-sheet-table-wrap {
		margin-top: 0.5rem;
		overflow-x: auto;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.82rem;
	}

	.case-sheet-table {
		width: 100%;
		border-collapse: collapse;
	}

	.case-sheet-table th,
	.case-sheet-table td {
		border: 1px solid
			color-mix(in oklab, currentColor 16%, transparent);
		padding: 0.35rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.case-sheet-table th {
		font-weight: 600;
		background: color-mix(in oklab, currentColor 6%, transparent);
	}

	.case-sheet-footer {
		margin-top: 2rem;
		padding-top: 0.75rem;
		border-top: 1px solid
			color-mix(in oklab, currentColor 14%, transparent);
		font-size: 0.78rem;
		color: color-mix(in oklab, currentColor 48%, transparent);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
</style>
