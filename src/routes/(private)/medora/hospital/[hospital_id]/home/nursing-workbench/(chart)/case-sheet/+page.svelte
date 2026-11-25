<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import PrintPreview from '$lib/component/own/library/menzies/PrintPreview.svelte';
	import LucideSave from '$lib/component/own/library/lucide/LucideSave.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { CaseSheetGetResponse } from '$lib/model/type/medora/case-sheet.type';
	import type { DocumentMasterPrintBootstrap } from '$lib/model/type/medora/document-print.type';
	import type {
		PatientDiagnosisListRow,
		ServiceOrderDetailListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import { m } from '$lib/paraglide/messages';
	import type { VitalRow } from '$lib/util/case-sheet-print-body.util';
	import { DocumentTypeId } from '$lib/model/constant/document-type-id.constant';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import type { CaseSheetPrintFormatters } from '$lib/util/case-sheet-print-body.util';
	import type { CaseSheetPrintLabels } from '$lib/util/case-sheet-print-body.util';
	import {
		buildCaseSheetBodyHtmlFromData,
		buildCaseSheetDocumentMasterPrintOptions
	} from '$lib/util/case-sheet-document-preview.util';
	import {
		buildPrintHtmlFromDocumentMasterBootstrap,
		fetchDocumentPrintBootstrap
	} from '$lib/util/document-master-print.util.svelte';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import {
	formatNumberDisplay,
	type NumberDisplayInput
} from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { printByFromPage } from '$lib/tool/emr/document-master-client-print.util';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { can } from '$lib/state/page-permission.state.svelte';

	type PatientVisitWithRelations = any;
	type PatientAllergyWithRelations = any;
	type DiagnosisWithType = any;
	type PatientFormEntryWithRelations = any;

	type OrderDetailVisitRow = ServiceOrderDetailListRow & {
		orderNo: string | null;
		serviceName: string | null;
		subCategoryName?: string | null;
		categoryName?: string | null;
	};

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

	let printBootstrap = $state<DocumentMasterPrintBootstrap | null>(
		null
	);
	let printTemplateReady = $state(false);
	let selectedPrintDocumentId = $state<number | null>(null);

	let isLoading = $state(false);
	let isSaving = $state(false);
	let mounted = $state(false);

	const toastService = new ToastService();

	const printByName = $derived(printByFromPage(page));

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

	function getVitalDisplayDate(v: VitalRow): string | null {
		return v.vitalDateTime ?? v.createdAt ?? null;
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function caseSheetContentLabels(): CaseSheetPrintLabels {
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
			vitalColDate: m.nursing_case_sheet_col_date(),
			vitalColHeight: m.nursing_case_sheet_col_height_cm(),
			vitalColWeight: m.nursing_case_sheet_col_weight_kg(),
			vitalColBmi: m.nursing_case_sheet_col_bmi(),
			vitalColBp: m.nursing_case_sheet_col_bp(),
			vitalColPulse: m.nursing_case_sheet_col_pulse(),
			vitalColTemp: m.nursing_case_sheet_col_temp(),
			vitalColSpo2: m.nursing_case_sheet_col_spo2(),
			vitalColSymptom: m.nursing_case_sheet_col_symptom(),
			vitalColRespiration: m.nursing_case_sheet_col_respiration(),
			vitalColRbs: m.nursing_case_sheet_col_rbs(),
			vitalColDescription: m.nursing_case_sheet_col_description(),
			vitalColRemark: m.remark(),
			orderColOrderNo: m.nursing_case_sheet_col_order_no(),
			orderColService: m.observation_emr_service(),
			orderColSubCategory: m.service_item_sub_category_label(),
			orderColCategory: m.service_item_category_label(),
			orderColDescription: m.observation_emr_instruction(),
			orderColTaxAmount: m.observation_emr_tax_amount(),
			orderColDiscount: m.op_billing_print_discount(),
			orderColNursingComplete:
				m.nursing_case_sheet_col_nursing_complete(),
			generatedFooter: m.nursing_case_sheet_generated()
		};
	}

	function caseSheetFormatters(): CaseSheetPrintFormatters {
		return {
			formatText,
			formatDateTime: (value) =>
				formatMenziesTableDateTime(value, '–'),
			formatVital,
			formatNumberDisplay: (value) =>
				formatNumberDisplay(value as NumberDisplayInput),
			getVitalDisplayDate
		};
	}

	function caseSheetMasterLabelPlaceholders() {
		return {
			title: m.nursing_case_sheet_title(),
			visitNo: m.visit_history_visit_label_visit_no(),
			patient: m.visit_history_visit_label_patient(),
			patientCode: m.visit_history_visit_label_patient_code(),
			visitDate: m.visit_history_visit_label_visit_date(),
			doctor: m.visit_history_visit_label_doctor(),
			generated: m.nursing_case_sheet_generated()
		};
	}

	function buildCaseSheetPrintOpts() {
		const bodyHtml = buildCaseSheetBodyHtmlFromData(
			caseSheetContentLabels(),
			caseSheetFormatters(),
			{
				chiefComplaintEntries,
				patientConditionEntries,
				visitDiagnoses,
				allergies,
				vitals,
				orderLines
			}
		);

		return {
			...buildCaseSheetDocumentMasterPrintOptions({
				visit: visitRow,
				printBy: printByName,
				bodyHtml,
				labels: caseSheetMasterLabelPlaceholders()
			}),
			iframeId: 'case-sheet-print-iframe'
		};
	}

	const caseSheetPreviewHtml = $derived.by(() => {
		if (
			!printTemplateReady ||
			!printBootstrap?.document?.documentText
		) {
			return '';
		}
		if (!visitRow) return '';
		try {
			return buildPrintHtmlFromDocumentMasterBootstrap(
				printBootstrap,
				buildCaseSheetPrintOpts(),
				'browser'
			);
		} catch (err) {
			console.error('Case sheet preview HTML failed', err);
			return '';
		}
	});

	function bootstrapMatchesSelection(
		bootstrap: DocumentMasterPrintBootstrap | null
	): boolean {
		const doc = bootstrap?.document;
		if (!doc?.documentText) return false;
		if (selectedPrintDocumentId == null) return true;
		return doc.id === selectedPrintDocumentId;
	}

	async function loadPrintBootstrap(
		documentId: number | null = selectedPrintDocumentId
	): Promise<DocumentMasterPrintBootstrap | null> {
		if (!hospitalId) return null;
		try {
			const bootstrap = await fetchDocumentPrintBootstrap(
				hospitalId,
				{
					documentTypeId: DocumentTypeId.CASE_SHEET_PRINT,
					documentId
				}
			);
			printBootstrap = bootstrap;
			printTemplateReady = Boolean(bootstrap.document?.documentText);
			return bootstrap.document?.documentText ? bootstrap : null;
		} catch (err) {
			console.error('Case sheet template load failed', err);
			printBootstrap = null;
			printTemplateReady = false;
			return null;
		}
	}

	async function ensurePrintBootstrap(): Promise<DocumentMasterPrintBootstrap | null> {
		if (bootstrapMatchesSelection(printBootstrap)) return printBootstrap;
		return loadPrintBootstrap();
	}

	async function loadCaseSheet() {
		if (!visitId) {
			visitRow = null;
			allergies = [];
			vitals = [];
			orderLines = [];
			visitDiagnoses = [];
			chiefComplaintEntries = [];
			patientConditionEntries = [];
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
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (!mounted || !hospitalId) return;
		void loadPrintBootstrap(selectedPrintDocumentId);
	});

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
			return;
		}
		void loadCaseSheet();
	});

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
			const bootstrap = await ensurePrintBootstrap();
			if (!bootstrap?.document?.documentText) {
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
				'browser'
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
			<div
				class="no-print mb-3 flex flex-wrap items-center justify-between gap-2"
			>
				<h2 class="text-lg font-semibold">
					{m.nursing_case_sheet_title()}
				</h2>
				<div class="flex shrink-0 items-center gap-1">
					<div class="tooltip tooltip-primary" data-tip={m.save()}>
						<button
							type="button"
							class="btn btn-ghost btn-square btn-primary"
							class:cursor-pointer={!isSaving}
							class:cursor-not-allowed={isSaving}
							class:loading={isSaving}
							disabled={isSaving || !can(PageActionEnum.EDIT)}
							aria-busy={isSaving}
							aria-label={m.save()}
							onclick={saveCaseSheet}
						>
							<LucideSave className="size-4" />
						</button>
					</div>
				</div>
			</div>

			{#if !printTemplateReady}
				<WashAlert
					type={StatusColorEnum.ERROR}
					message="Failed to prepare case sheet print. Run DB seed or configure CASE_SHEET_PRINT in Document Master."
					className="z-0"
				/>
			{:else if hospitalId}
				<PrintPreview
					html={caseSheetPreviewHtml}
					title={m.nursing_case_sheet_title()}
					minHeight="min-h-[75vh]"
					showDownloadButton={false}
					printLabel={m.nursing_case_sheet_print()}
					documentTemplateHospitalId={hospitalId}
					documentTemplateTypeId={DocumentTypeId.CASE_SHEET_PRINT}
					bind:selectedDocumentTemplateId={selectedPrintDocumentId}
					emptyMessage={caseSheetPreviewHtml
						? 'No preview'
						: 'Loading preview…'}
				/>
			{/if}
		{/if}
	{/if}
</div>
