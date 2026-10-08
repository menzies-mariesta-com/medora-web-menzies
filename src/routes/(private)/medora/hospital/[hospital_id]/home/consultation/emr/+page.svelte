<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LObservationOrderLineDialogContent from '$lib/component/own/local/private/medora/observation/LObservationOrderLineDialogContent.svelte';
	import LObservationDiagnosisDialogContent from '$lib/component/own/local/private/medora/observation/LObservationDiagnosisDialogContent.svelte';
	import LObservationFormEntryDialogContent from '$lib/component/own/local/private/medora/observation/LObservationFormEntryDialogContent.svelte';
	import LObservationDiagnosisDeleteConfirmDialogContent from '$lib/component/own/local/private/medora/observation/LObservationDiagnosisDeleteConfirmDialogContent.svelte';
	import LObservationFormEntryDeleteConfirmDialogContent from '$lib/component/own/local/private/medora/observation/LObservationFormEntryDeleteConfirmDialogContent.svelte';
	import LObservationPlanOfCareDialogContent from '$lib/component/own/local/private/medora/observation/LObservationPlanOfCareDialogContent.svelte';
	import LObservationPlanOfCareDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationPlanOfCareDeleteDialogContent.svelte';
	import LObservationAllergyDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationAllergyDeleteDialogContent.svelte';
	import LObservationOrderLineDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationOrderLineDeleteDialogContent.svelte';
	import LObservationProgressNoteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationProgressNoteDialogContent.svelte';
	import LObservationProgressNoteDeleteDialogContent from '$lib/component/own/local/private/medora/observation/LObservationProgressNoteDeleteDialogContent.svelte';
	import LEmrComplaintConditionTransfer from '$lib/component/own/local/private/medora/observation/LEmrComplaintConditionTransfer.svelte';
	import LEmrGlanceCardPanel from '$lib/component/own/local/private/medora/observation/LEmrGlanceCardPanel.svelte';
	import LVitalRecordDialogContent from '$lib/component/own/local/private/medora/emr/LVitalRecordDialogContent.svelte';
	import LPatientAllergyDialogContent from '$lib/component/own/local/private/medora/emr/LPatientAllergyDialogContent.svelte';
	import LOrderIpdAdmissionDialogContent from '$lib/component/own/local/private/medora/ipd/LOrderIpdAdmissionDialogContent.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { ObservationOrderLineDialogState } from '$lib/state/observation-order-line-dialog.state.svelte';
	import { ObservationDiagnosisDialogState } from '$lib/state/observation-diagnosis-dialog.state.svelte';
	import { ObservationDiagnosisDeleteConfirmDialogState } from '$lib/state/observation-diagnosis-delete-confirm-dialog.state.svelte';
	import { ObservationFormEntryDialogState } from '$lib/state/observation-form-entry-dialog.state.svelte';
	import { ObservationFormEntryDeleteConfirmDialogState } from '$lib/state/observation-form-entry-delete-confirm-dialog.state.svelte';
	import { ObservationPlanOfCareDialogState } from '$lib/state/observation-plan-of-care-dialog.state.svelte';
	import { ObservationProgressNoteDialogState } from '$lib/state/observation-progress-note-dialog.state.svelte';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type {
		PatientDiagnosisListRow,
		ServiceOrderDetailListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import type { PlanOfCareListRow } from '$lib/model/type/medora/plan-of-care.type';
	import type { ProgressNoteListRow } from '$lib/model/type/medora/progress-note.type';
	import type { ProblemListRow } from '$lib/model/type/medora/clinical.type';
	import type {
		ObservationEmrDiagnosisRow,
		ObservationEmrFormEntryRow,
		ObservationEmrPatientAllergyRow,
		ObservationEmrPatientVisitRow
	} from '$lib/model/type/medora/observation-emr.type';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	/** Paraglide `m` typings can lag behind `messages/*.json`; messages exist at runtime. */
	const msg = m as Record<string, (inputs?: object) => string>;

	type OrderDetailVisitRow = ServiceOrderDetailListRow & {
		orderNo: string | null;
		serviceName: string | null;
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

	const cpoeOrderRedirectHref = $derived(
		hospitalId && visitId
			? `/medora/hospital/${hospitalId}/home/consultation/cpoe/order?visitId=${visitId}`
			: ''
	);

	const clinicalVisitReadOnly = $derived(
		VisitState.isClinicalVisitReadOnly
	);

	let visitRow = $state<PatientVisitRow | null>(null);
	/** Pending ADT admission order for this OPD visit (blocks re-order). */
	let pendingAdmissionOrderId = $state<number | null>(null);

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
	let hpiEntries = $state<PatientFormEntryWithRelations[]>([]);
	let physicalExamEntries = $state<PatientFormEntryWithRelations[]>(
		[]
	);
	let specialtyEntries = $state<PatientFormEntryWithRelations[]>([]);
	let specialtyColumnFilters = $state<Record<string, string>>({
		specialtyType: '',
		status: 'active'
	});

	const SPECIALTY_FORM_CODES = [
		'specialty_obstetrics',
		'specialty_pediatrics',
		'specialty_surgery',
		'specialty_emergency'
	] as const;

	const specialtyFormCodeOptions = $derived(
		SPECIALTY_FORM_CODES.map((code) => ({
			value: code,
			label: specialtyFormCodeLabel(code)
		}))
	);

	function specialtyFormCodeLabel(code: string | null | undefined): string {
		switch (code) {
			case 'specialty_obstetrics':
				return msg.observation_emr_specialty_obstetrics();
			case 'specialty_pediatrics':
				return msg.observation_emr_specialty_pediatrics();
			case 'specialty_surgery':
				return msg.observation_emr_specialty_surgery();
			case 'specialty_emergency':
				return msg.observation_emr_specialty_emergency();
			default:
				return code?.trim() || '–';
		}
	}

	async function loadAllSpecialtyEntries(
		vid: number
	): Promise<PatientFormEntryWithRelations[]> {
		const batches = await Promise.all(
			SPECIALTY_FORM_CODES.map((formCode) =>
				apiGet<PatientFormEntryWithRelations[]>('formEntry.list', {
					visitId: String(vid),
					formCode
				})
			)
		);
		return batches
			.flat()
			.sort((a, b) => {
				const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
				const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
				return tb - ta;
			});
	}

	const filteredSpecialtyEntries = $derived.by(() => {
		const typeFilter = specialtyColumnFilters.specialtyType?.trim() ?? '';
		const statusFilter = specialtyColumnFilters.status?.trim() ?? '';
		return specialtyEntries.filter((row) => {
			if (typeFilter && row.formName?.code !== typeFilter) return false;
			if (statusFilter === 'active') {
				return row.statusId === StatusEnum.ACTIVE;
			}
			if (statusFilter === 'inactive') {
				return row.statusId === StatusEnum.INACTIVE;
			}
			return true;
		});
	});

	let planOfCareRows = $state<PlanOfCareListRow[]>([]);
	let progressNoteRows = $state<ProgressNoteListRow[]>([]);
	let problemListRows = $state<ProblemListRow[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingGrid = $state(false);
	let isTransferringFormEntries = $state(false);
	let isSigningClinical = $state(false);
	/** Loading only the allergy table (nursing OPD–style patient-wide list). */
	let isLoadingAllergies = $state(false);
	let mounted = $state(false);

	/** Same server-side filter shape as nursing OPD allergy (`statusId` in remote). */
	let allergyColumnFilters = $state<Record<string, string>>({
		status: String(StatusEnum.ACTIVE)
	});
	let vitalColumnFilters = $state<Record<string, string>>({
		status: 'active'
	});
	let diagnosisColumnFilters = $state<Record<string, string>>({
		status: 'active'
	});
	let planOfCareColumnFilters = $state<Record<string, string>>({
		status: 'active'
	});
	let progressNoteColumnFilters = $state<Record<string, string>>({
		status: 'active'
	});
	let orderColumnFilters = $state<Record<string, string>>({
		lineStatus: 'active'
	});
	let allergyPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let allergyCurrentPage = $state(1);
	let allergyTotal = $state(0);
	let lastAllergiesFetchKey = $state('');

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	type PatientAllergyWithRelations = ObservationEmrPatientAllergyRow;
	type DiagnosisWithType = ObservationEmrDiagnosisRow;
	type PatientFormEntryWithRelations = ObservationEmrFormEntryRow;
	type PatientVisitRow = ObservationEmrPatientVisitRow;

	function getApiBase(): string {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		return `/api/medora/hospital/${hid}/home/consultation/emr`;
	}

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string>
	) {
		const url = new URL(getApiBase(), location.origin);
		url.searchParams.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params))
				url.searchParams.set(k, v);
		}
		const res = await fetch(url.toString());
		if (!res.ok) await throwUserFacingHttpError(res);
		return (await res.json()) as T;
	}

	async function apiPost<T>(
		mode: string,
		payload: Record<string, unknown>
	) {
		const res = await fetch(getApiBase(), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode, ...payload })
		});
		if (!res.ok) await throwUserFacingHttpError(res);
		return (await res.json()) as T;
	}

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

	async function fetchAllergies(options?: {
		force?: boolean;
		skipRowLoading?: boolean;
	}) {
		const patientId = visitRow?.patientId;
		const hospitalIdParam = visitRow?.hospitalId ?? hospitalId;
		if (!patientId || !hospitalIdParam) {
			allergies = [];
			allergyTotal = 0;
			return;
		}
		const pageSize = Number(allergyPageSizeStr) || 10;
		const requestKey = JSON.stringify({
			patientId,
			hospitalIdParam,
			page: allergyCurrentPage,
			pageSize,
			visitNo: allergyColumnFilters.visitNo?.trim() || '',
			severity: allergyColumnFilters.severity?.trim() || '',
			status: allergyColumnFilters.status ?? ''
		});
		if (!options?.force && requestKey === lastAllergiesFetchKey) {
			return;
		}
		lastAllergiesFetchKey = requestKey;
		if (!options?.skipRowLoading) isLoadingAllergies = true;
		try {
			const statusId = allergyColumnFilters.status
				? Number(allergyColumnFilters.status)
				: undefined;
			const result = await apiGet<{
				data: PatientAllergyWithRelations[];
				total: number;
			}>('allergy.listPaginated', {
				patientId,
				page: String(allergyCurrentPage),
				pageSize: String(pageSize),
				visitNo: allergyColumnFilters.visitNo?.trim() || '',
				severityName: allergyColumnFilters.severity?.trim() || '',
				statusId:
					statusId != null && Number.isFinite(statusId)
						? String(statusId)
						: ''
			});
			allergies = result.data;
			allergyTotal = result.total;
		} catch {
			const data = await apiGet<PatientAllergyWithRelations[]>(
				'allergy.list',
				{ patientId }
			);
			const filtered = hospitalIdParam
				? data.filter(
						(row: PatientAllergyWithRelations) =>
							row.visit?.hospitalId === hospitalIdParam
					)
				: data;
			allergies = filtered;
			allergyTotal = filtered.length;
		} finally {
			if (!options?.skipRowLoading) isLoadingAllergies = false;
		}
	}

	async function refreshAllForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			let v: PatientVisitRow | null = null;
			try {
				v = await apiGet<PatientVisitRow | null>('visit.get', {
					visitId: String(visitId)
				});
			} catch {
				visitRow = null;
				pendingAdmissionOrderId = null;
				allergies = [];
				allergyTotal = 0;
				vitals = [];
				orderLines = [];
				visitDiagnoses = [];
				chiefComplaintEntries = [];
				patientConditionEntries = [];
				planOfCareRows = [];
				progressNoteRows = [];
				problemListRows = [];
				return;
			}
			visitRow = v;
			if (!v) {
				pendingAdmissionOrderId = null;
				allergies = [];
				allergyTotal = 0;
				vitals = [];
				orderLines = [];
				visitDiagnoses = [];
				chiefComplaintEntries = [];
				patientConditionEntries = [];
				planOfCareRows = [];
				progressNoteRows = [];
				problemListRows = [];
				return;
			}
			await Promise.all([
				(async () => {
					if (
						!hospitalId ||
						v.visitTypeId !== VisitTypeEnum.OPD
					) {
						pendingAdmissionOrderId = null;
						return;
					}
					try {
						const res = await fetch(
							`/api/medora/hospital/${hospitalId}/home/adt/admission-order?sourceOpdVisitId=${encodeURIComponent(String(visitId))}`,
							{ credentials: 'include' }
						);
						if (!res.ok) {
							pendingAdmissionOrderId = null;
							return;
						}
						const pending = (await res.json()) as {
							id?: number;
						} | null;
						pendingAdmissionOrderId =
							pending?.id != null && Number.isFinite(pending.id)
								? pending.id
								: null;
					} catch {
						pendingAdmissionOrderId = null;
					}
				})(),
				fetchAllergies({ force: true, skipRowLoading: true }),
				(async () => {
					vitals = await apiGet<PatientDiagnosisListRow[]>(
						'vital.listByVisit',
						{ visitId: String(visitId) }
					);
				})(),
				(async () => {
					orderLines = (await apiGet<OrderDetailVisitRow[]>(
						'orderLine.list',
						{ visitId: String(visitId) }
					)) as OrderDetailVisitRow[];
				})(),
				(async () => {
					visitDiagnoses = await apiGet<DiagnosisWithType[]>(
						'diagnosis.list',
						{ visitId: String(visitId) }
					);
				})(),
				(async () => {
					planOfCareRows = await apiGet<PlanOfCareListRow[]>(
						'planOfCare.list',
						{ visitId: String(visitId) }
					);
				})(),
				(async () => {
					progressNoteRows = await apiGet<ProgressNoteListRow[]>(
						'progressNote.list',
						{ visitId: String(visitId) }
					);
				})(),
				(async () => {
					problemListRows = await apiGet<ProblemListRow[]>(
						'problemList.list',
						{ patientId: String(v.patientId) }
					);
				})(),
				(async () => {
					try {
						const [cc, hpi, exam, specialty] = await Promise.all([
							apiGet<PatientFormEntryWithRelations[]>(
								'formEntry.list',
								{
									visitId: String(visitId),
									formCode: 'chief_complaint'
								}
							),
							apiGet<PatientFormEntryWithRelations[]>(
								'formEntry.list',
								{
									visitId: String(visitId),
									formCode: 'hpi'
								}
							),
							apiGet<PatientFormEntryWithRelations[]>(
								'formEntry.list',
								{
									visitId: String(visitId),
									formCode: 'physical_exam'
								}
							),
							loadAllSpecialtyEntries(visitId)
						]);
						chiefComplaintEntries = cc;
						hpiEntries = hpi;
						physicalExamEntries = exam;
						specialtyEntries = specialty;
						if (v?.patientId) {
							patientConditionEntries = await apiGet<
								PatientFormEntryWithRelations[]
							>('formEntry.patientList', {
								patientId: String(v.patientId),
								formCode: 'patient_condition'
							});
						} else {
							patientConditionEntries = await apiGet<
								PatientFormEntryWithRelations[]
							>('formEntry.list', {
								visitId: String(visitId),
								formCode: 'patient_condition'
							});
						}
					} catch {
						chiefComplaintEntries = [];
						patientConditionEntries = [];
						hpiEntries = [];
						physicalExamEntries = [];
						specialtyEntries = [];
					}
				})()
			]);
		} finally {
			isLoadingGrid = false;
		}
	}

	/** Same refresh strategy as nursing OPD allergy (patient-wide list). */
	async function reloadAllergiesForVisit(
		eOrOptions?:
			| CustomEvent<void>
			| {
					skipRowLoading?: boolean;
			  }
	) {
		const skipRowLoading =
			typeof eOrOptions === 'object' &&
			eOrOptions !== null &&
			'skipRowLoading' in eOrOptions
				? eOrOptions.skipRowLoading
				: false;

		if (!visitRow?.patientId) return;
		await fetchAllergies({ force: true, skipRowLoading });
	}

	async function reloadVitalsForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			vitals = await apiGet<PatientDiagnosisListRow[]>(
				'vital.listByVisit',
				{ visitId: String(visitId) }
			);
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadOrdersForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			orderLines = await apiGet<OrderDetailVisitRow[]>(
				'orderLine.list',
				{ visitId: String(visitId) }
			);
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadDiagnosesForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			visitDiagnoses = await apiGet<DiagnosisWithType[]>(
				'diagnosis.list',
				{ visitId: String(visitId) }
			);
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadPlanOfCareForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			planOfCareRows = await apiGet<PlanOfCareListRow[]>(
				'planOfCare.list',
				{ visitId: String(visitId) }
			);
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadProgressNoteForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			progressNoteRows = await apiGet<ProgressNoteListRow[]>(
				'progressNote.list',
				{ visitId: String(visitId) }
			);
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadFormEntriesForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			try {
				const [cc, hpi, exam, specialty] = await Promise.all([
					apiGet<PatientFormEntryWithRelations[]>(
						'formEntry.list',
						{
							visitId: String(visitId),
							formCode: 'chief_complaint'
						}
					),
					apiGet<PatientFormEntryWithRelations[]>(
						'formEntry.list',
						{ visitId: String(visitId), formCode: 'hpi' }
					),
					apiGet<PatientFormEntryWithRelations[]>(
						'formEntry.list',
						{
							visitId: String(visitId),
							formCode: 'physical_exam'
						}
					),
					loadAllSpecialtyEntries(visitId)
				]);
				chiefComplaintEntries = cc;
				hpiEntries = hpi;
				physicalExamEntries = exam;
				specialtyEntries = specialty;
				if (visitRow?.patientId) {
					patientConditionEntries = await apiGet<
						PatientFormEntryWithRelations[]
					>('formEntry.patientList', {
						patientId: String(visitRow.patientId),
						formCode: 'patient_condition'
					});
				} else {
					patientConditionEntries = await apiGet<
						PatientFormEntryWithRelations[]
					>('formEntry.list', {
						visitId: String(visitId),
						formCode: 'patient_condition'
					});
				}
			} catch {
				chiefComplaintEntries = [];
				patientConditionEntries = [];
				hpiEntries = [];
				physicalExamEntries = [];
				specialtyEntries = [];
			}
		} finally {
			isLoadingGrid = false;
		}
	}

	afterNavigate(() => {
		if (!mounted) return;
		if (!visitId) {
			visitRow = null;
			pendingAdmissionOrderId = null;
			allergies = [];
			allergyTotal = 0;
			allergyCurrentPage = 1;
			lastAllergiesFetchKey = '';
			vitals = [];
			orderLines = [];
			visitDiagnoses = [];
			chiefComplaintEntries = [];
			patientConditionEntries = [];
			hpiEntries = [];
			physicalExamEntries = [];
			specialtyEntries = [];
			planOfCareRows = [];
			progressNoteRows = [];
			problemListRows = [];
			return;
		}
		isLoadingVisit = true;
		(async () => {
			try {
				await refreshAllForVisit();
			} finally {
				isLoadingVisit = false;
			}
		})();
	});

	/** Reload visit status tagging after clinical sign/unsign from layout or page. */
	$effect(() => {
		const rev = VisitState.clinicalSignRevision;
		if (!mounted || rev === 0 || !visitId) return;
		void refreshAllForVisit();
	});

	async function handleSaveAsSigned() {
		if (!visitId) return;
		const result = await dialogService.open({
			title: m.observation_save_as_signed(),
			message: m.observation_save_as_signed_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		isSigningClinical = true;
		try {
			const row = await apiPost<{ clinicalSignedAt?: string | null }>(
				'visit.sign',
				{ visitId }
			);
			VisitState.setClinicalSignedAtFromVisit(
				row.clinicalSignedAt ?? new Date().toISOString()
			);
			await refreshAllForVisit();
			toastService.addToast(
				m.observation_save_as_signed_success(),
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			toastService.addErrorToast(
				'Could not save this visit as signed',
				err
			);
		} finally {
			isSigningClinical = false;
		}
	}

	async function openOrderIpdAdmission() {
		if (!hospitalId || !visitId || !visitRow?.branchId) return;
		if (visitRow.visitTypeId !== VisitTypeEnum.OPD) {
			toastService.addToast(
				'IPD admission can only be ordered from an OPD visit',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (pendingAdmissionOrderId != null) {
			toastService.addToast(
				'A pending admission order already exists for this visit',
				StatusColorEnum.WARNING
			);
			return;
		}
		const result = await dialogService.open({
			title: 'Order IPD Admission',
			variant: DialogVariantEnum.ALERT,
			modalClassName: 'max-w-lg',
			component: LOrderIpdAdmissionDialogContent,
			props: {
				hospitalId,
				sourceOpdVisitId: visitId,
				branchId: visitRow.branchId,
				orderingDoctorId: visitRow.doctorId ?? null
			}
		});
		if (result.confirmed) {
			const data = result.data as { id?: number } | undefined;
			if (data?.id != null && Number.isFinite(data.id)) {
				pendingAdmissionOrderId = data.id;
			} else {
				try {
					const res = await fetch(
						`/api/medora/hospital/${hospitalId}/home/adt/admission-order?sourceOpdVisitId=${encodeURIComponent(String(visitId))}`,
						{ credentials: 'include' }
					);
					if (res.ok) {
						const pending = (await res.json()) as {
							id?: number;
						} | null;
						pendingAdmissionOrderId =
							pending?.id != null && Number.isFinite(pending.id)
								? pending.id
								: null;
					}
				} catch {
					/* keep prior */
				}
			}
		}
	}

	const canOrderIpdAdmission = $derived(
		!!visitRow?.branchId &&
			visitRow?.visitTypeId === VisitTypeEnum.OPD &&
			pendingAdmissionOrderId == null &&
			!isLoadingVisit
	);

	const allergyPageCount = $derived(
		Math.max(1, Math.ceil(allergyTotal / (Number(allergyPageSizeStr) || 10)))
	);

	const filteredVitals = $derived.by(() => {
		const statusFilter = vitalColumnFilters.status?.trim() ?? '';
		if (!statusFilter) return vitals;
		return vitals.filter((row) => {
			if (statusFilter === 'active') return row.statusId === StatusEnum.ACTIVE;
			if (statusFilter === 'inactive') return row.statusId === StatusEnum.INACTIVE;
			return true;
		});
	});

	const filteredDiagnoses = $derived.by(() => {
		const statusFilter = diagnosisColumnFilters.status?.trim() ?? '';
		if (!statusFilter) return visitDiagnoses;
		return visitDiagnoses.filter((row) => {
			if (statusFilter === 'active') return row.statusId === StatusEnum.ACTIVE;
			if (statusFilter === 'inactive') return row.statusId === StatusEnum.INACTIVE;
			return true;
		});
	});

	const filteredPlanOfCare = $derived.by(() => {
		const statusFilter = planOfCareColumnFilters.status?.trim() ?? '';
		if (!statusFilter) return planOfCareRows;
		return planOfCareRows.filter((row) => {
			if (statusFilter === 'active') return row.statusId === StatusEnum.ACTIVE;
			if (statusFilter === 'inactive') return row.statusId === StatusEnum.INACTIVE;
			return true;
		});
	});

	const filteredProgressNotes = $derived.by(() => {
		const statusFilter = progressNoteColumnFilters.status?.trim() ?? '';
		if (!statusFilter) return progressNoteRows;
		return progressNoteRows.filter((row) => {
			if (statusFilter === 'active') return row.statusId === StatusEnum.ACTIVE;
			if (statusFilter === 'inactive') return row.statusId === StatusEnum.INACTIVE;
			return true;
		});
	});

	const filteredOrderLines = $derived.by(() => {
		const statusFilter = orderColumnFilters.lineStatus?.trim() ?? '';
		if (!statusFilter) return orderLines;
		return orderLines.filter((row) => {
			if (statusFilter === 'active') return row.statusId === StatusEnum.ACTIVE;
			if (statusFilter === 'inactive') return row.statusId === StatusEnum.INACTIVE;
			return true;
		});
	});

	function vitalCardSummary(row: PatientDiagnosisListRow): string {
		const bp = `${formatVital(row.bpSystolic)}/${formatVital(row.bpDiastolic)}`;
		return msg.observation_emr_vital_summary({
			bp,
			pulse: formatVital(row.pulse),
			temp: formatVital(row.temperature),
			spo2: formatVital(row.spO2)
		});
	}

	function entryStatusLabel(statusId: number | null | undefined): string {
		if (statusId === StatusEnum.ACTIVE) return msg.observation_emr_status_active();
		if (statusId === StatusEnum.INACTIVE) return msg.observation_emr_status_inactive();
		return '';
	}

	async function openAllergyAdd() {
		if (!visitRow?.patientId || !visitId) return;
		PatientAllergyDialogState.patientId = visitRow.patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.hospitalId =
			visitRow.hospitalId ?? hospitalId ?? null;
		PatientAllergyDialogState.patientAllergyId = null;
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.hospitalId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: async (data) => {
					if (data?.saved)
						await reloadAllergiesForVisit({ skipRowLoading: true });
				}
			});
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.hospitalId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function openAllergyEdit(row: PatientAllergyWithRelations) {
		if (!visitRow?.patientId) return;
		PatientAllergyDialogState.patientId = visitRow.patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.hospitalId =
			visitRow.hospitalId ?? hospitalId ?? null;
		PatientAllergyDialogState.patientAllergyId = row.id;
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.hospitalId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: async (data) => {
					if (data?.saved)
						await reloadAllergiesForVisit({ skipRowLoading: true });
				}
			});
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.hospitalId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function handleAllergyDelete(
		row: PatientAllergyWithRelations
	) {
		const allergyName = row.allergy?.name ?? 'this allergy';
		const result = await dialogService.open<{
			deactivationRemark?: string;
		}>({
			title: `${m.observation_emr_allergy_inactivate_title()}: ${allergyName}`,
			component: LObservationAllergyDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await apiPost('allergy.delete', {
				id: row.id,
				deactivationRemark: result.data?.deactivationRemark ?? ''
			});
			toastSuccess(
				toastService,
				m.entity_patient_allergy(),
				m.toast_action_inactivated()
			);
			await reloadAllergiesForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_inactivate_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openVitalAdd() {
		if (!visitRow?.patientId || !visitRow.hospitalId || !visitId)
			return;
		VitalRecordDialogState.patientId = visitRow.patientId;
		VitalRecordDialogState.hospitalId = visitRow.hospitalId;
		VitalRecordDialogState.visitId = visitId;
		VitalRecordDialogState.vitalId = null;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Record new vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.patientId = null;
					VitalRecordDialogState.hospitalId = null;
					VitalRecordDialogState.visitId = null;
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadVitalsForVisit();
			}
		} finally {
			VitalRecordDialogState.patientId = null;
			VitalRecordDialogState.hospitalId = null;
			VitalRecordDialogState.visitId = null;
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function openVitalEdit(v: PatientDiagnosisListRow) {
		if (!visitRow?.patientId || !visitRow.hospitalId || !visitId)
			return;
		VitalRecordDialogState.patientId = visitRow.patientId;
		VitalRecordDialogState.hospitalId = visitRow.hospitalId;
		VitalRecordDialogState.visitId = visitId;
		VitalRecordDialogState.vitalId = v.id;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadVitalsForVisit();
			}
		} finally {
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function handleVitalDelete(v: PatientDiagnosisListRow) {
		const result = await dialogService.open({
			title: m.observation_emr_vital_inactivate_title(),
			message: m.observation_emr_vital_inactivate_message({
				date: formatDateTime(getVitalDisplayDate(v) ?? null)
			}),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await apiPost('vital.delete', { id: v.id });
			toastSuccess(
				toastService,
				m.entity_patient_vital(),
				m.toast_action_inactivated()
			);
			await reloadVitalsForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openDiagnosisAdd() {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId)
			return;
		ObservationDiagnosisDialogState.patientId = visitRow.patientId;
		ObservationDiagnosisDialogState.branchId = visitRow.branchId;
		ObservationDiagnosisDialogState.visitId = visitId;
		ObservationDiagnosisDialogState.diagnosisId = null;
		ObservationDiagnosisDialogState.onSaved = () =>
			reloadDiagnosesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Add diagnosis',
				component: LObservationDiagnosisDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationDiagnosisDialogState.diagnosisId = null;
					ObservationDiagnosisDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadDiagnosesForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadDiagnosesForVisit();
			}
		} finally {
			ObservationDiagnosisDialogState.patientId = null;
			ObservationDiagnosisDialogState.branchId = null;
			ObservationDiagnosisDialogState.visitId = null;
			ObservationDiagnosisDialogState.diagnosisId = null;
			ObservationDiagnosisDialogState.onSaved = null;
		}
	}

	async function openDiagnosisEdit(row: DiagnosisWithType) {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId)
			return;
		ObservationDiagnosisDialogState.patientId = visitRow.patientId;
		ObservationDiagnosisDialogState.branchId = visitRow.branchId;
		ObservationDiagnosisDialogState.visitId = visitId;
		ObservationDiagnosisDialogState.diagnosisId = row.id;
		ObservationDiagnosisDialogState.onSaved = () =>
			reloadDiagnosesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit diagnosis',
				component: LObservationDiagnosisDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationDiagnosisDialogState.diagnosisId = null;
					ObservationDiagnosisDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadDiagnosesForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadDiagnosesForVisit();
			}
		} finally {
			ObservationDiagnosisDialogState.diagnosisId = null;
			ObservationDiagnosisDialogState.onSaved = null;
		}
	}

	async function handleDiagnosisDelete(row: DiagnosisWithType) {
		const requiredDescription = row.description?.trim() ?? '';
		if (!requiredDescription) {
			toastService.addToast(
				'Diagnosis description is required before inactivation. Please edit and add description first.',
				StatusColorEnum.ERROR
			);
			return;
		}
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
			requiredDescription;
		const result = await dialogService.open<{ confirmed?: boolean }>({
			title: m.observation_emr_diagnosis_inactivate_title(),
			component: LObservationDiagnosisDeleteConfirmDialogContent,
			fullScreen: false,
			modalClassName:
				'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
					null;
			}
		});
		if (!result.confirmed || !result.data?.confirmed) return;
		try {
			await apiPost('diagnosis.delete', { id: row.id });
			toastSuccess(
				toastService,
				m.entity_patient_diagnosis(),
				m.toast_action_inactivated()
			);
			await reloadDiagnosesForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openPlanOfCareAdd() {
		if (!visitRow?.patientId || !visitId || !hospitalId) return;
		ObservationPlanOfCareDialogState.hospitalId = hospitalId;
		ObservationPlanOfCareDialogState.patientId = visitRow.patientId;
		ObservationPlanOfCareDialogState.visitId = visitId;
		ObservationPlanOfCareDialogState.planOfCareId = null;
		ObservationPlanOfCareDialogState.onSaved = () =>
			reloadPlanOfCareForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: m.observation_emr_plan_of_care_add(),
				component: LObservationPlanOfCareDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationPlanOfCareDialogState.planOfCareId = null;
					ObservationPlanOfCareDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadPlanOfCareForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadPlanOfCareForVisit();
			}
		} finally {
			ObservationPlanOfCareDialogState.hospitalId = null;
			ObservationPlanOfCareDialogState.patientId = null;
			ObservationPlanOfCareDialogState.visitId = null;
			ObservationPlanOfCareDialogState.planOfCareId = null;
			ObservationPlanOfCareDialogState.onSaved = null;
		}
	}

	async function openPlanOfCareEdit(row: PlanOfCareListRow) {
		if (!visitRow?.patientId || !visitId || !hospitalId) return;
		ObservationPlanOfCareDialogState.hospitalId = hospitalId;
		ObservationPlanOfCareDialogState.patientId = visitRow.patientId;
		ObservationPlanOfCareDialogState.visitId = visitId;
		ObservationPlanOfCareDialogState.planOfCareId = row.id;
		ObservationPlanOfCareDialogState.onSaved = () =>
			reloadPlanOfCareForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: m.observation_emr_plan_of_care_edit(),
				component: LObservationPlanOfCareDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationPlanOfCareDialogState.planOfCareId = null;
					ObservationPlanOfCareDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadPlanOfCareForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadPlanOfCareForVisit();
			}
		} finally {
			ObservationPlanOfCareDialogState.hospitalId = null;
			ObservationPlanOfCareDialogState.patientId = null;
			ObservationPlanOfCareDialogState.visitId = null;
			ObservationPlanOfCareDialogState.planOfCareId = null;
			ObservationPlanOfCareDialogState.onSaved = null;
		}
	}

	async function handlePlanOfCareDelete(row: PlanOfCareListRow) {
		const result = await dialogService.open<{
			deleteRemark?: string;
		}>({
			title: m.observation_emr_plan_of_care_delete_title(),
			component: LObservationPlanOfCareDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await apiPost('planOfCare.delete', {
				id: row.id,
				deleteRemark: result.data?.deleteRemark ?? ''
			});
			toastService.addToast(
				m.observation_emr_plan_of_care_deleted(),
				StatusColorEnum.SUCCESS
			);
			await reloadPlanOfCareForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openProgressNoteAdd() {
		if (!visitRow?.patientId || !visitId || !hospitalId) return;
		ObservationProgressNoteDialogState.hospitalId = hospitalId;
		ObservationProgressNoteDialogState.patientId = visitRow.patientId;
		ObservationProgressNoteDialogState.visitId = visitId;
		ObservationProgressNoteDialogState.progressNoteId = null;
		ObservationProgressNoteDialogState.onSaved = () =>
			reloadProgressNoteForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: m.observation_emr_progress_note_add(),
				component: LObservationProgressNoteDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationProgressNoteDialogState.progressNoteId = null;
					ObservationProgressNoteDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadProgressNoteForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadProgressNoteForVisit();
			}
		} finally {
			ObservationProgressNoteDialogState.hospitalId = null;
			ObservationProgressNoteDialogState.patientId = null;
			ObservationProgressNoteDialogState.visitId = null;
			ObservationProgressNoteDialogState.progressNoteId = null;
			ObservationProgressNoteDialogState.onSaved = null;
		}
	}

	async function openProgressNoteEdit(row: ProgressNoteListRow) {
		if (!visitRow?.patientId || !visitId || !hospitalId) return;
		ObservationProgressNoteDialogState.hospitalId = hospitalId;
		ObservationProgressNoteDialogState.patientId = visitRow.patientId;
		ObservationProgressNoteDialogState.visitId = visitId;
		ObservationProgressNoteDialogState.progressNoteId = row.id;
		ObservationProgressNoteDialogState.onSaved = () =>
			reloadProgressNoteForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: m.observation_emr_progress_note_edit(),
				component: LObservationProgressNoteDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationProgressNoteDialogState.progressNoteId = null;
					ObservationProgressNoteDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadProgressNoteForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadProgressNoteForVisit();
			}
		} finally {
			ObservationProgressNoteDialogState.hospitalId = null;
			ObservationProgressNoteDialogState.patientId = null;
			ObservationProgressNoteDialogState.visitId = null;
			ObservationProgressNoteDialogState.progressNoteId = null;
			ObservationProgressNoteDialogState.onSaved = null;
		}
	}

	async function handleProgressNoteDelete(row: ProgressNoteListRow) {
		const result = await dialogService.open<{
			deleteRemark?: string;
		}>({
			title: m.observation_emr_progress_note_delete_title(),
			component: LObservationProgressNoteDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await apiPost('progressNote.delete', {
				id: row.id,
				deleteRemark: result.data?.deleteRemark ?? ''
			});
			toastService.addToast(
				m.observation_emr_progress_note_deleted(),
				StatusColorEnum.SUCCESS
			);
			await reloadProgressNoteForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openFormEntryAdd(formCode: string) {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId)
			return;
		const isSpecialty = formCode === 'specialty';
		ObservationFormEntryDialogState.entryId = null;
		ObservationFormEntryDialogState.visitId = visitId;
		ObservationFormEntryDialogState.branchId = visitRow.branchId;
		ObservationFormEntryDialogState.patientId = visitRow.patientId;
		ObservationFormEntryDialogState.formCode = isSpecialty
			? null
			: formCode;
		ObservationFormEntryDialogState.formCodeOptions = isSpecialty
			? specialtyFormCodeOptions
			: null;
		ObservationFormEntryDialogState.onSaved = () =>
			reloadFormEntriesForVisit();
		const titles: Record<string, string> = {
			chief_complaint: m.observation_emr_chief_complaint(),
			patient_condition: m.observation_emr_patient_condition(),
			hpi: msg.observation_emr_hpi(),
			physical_exam: msg.observation_emr_physical_exam(),
			specialty: msg.observation_emr_specialty_case_sheet()
		};
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: titles[formCode] ?? formCode,
				component: LObservationFormEntryDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadFormEntriesForVisit();
			}
		} finally {
			ObservationFormEntryDialogState.entryId = null;
			ObservationFormEntryDialogState.visitId = null;
			ObservationFormEntryDialogState.branchId = null;
			ObservationFormEntryDialogState.patientId = null;
			ObservationFormEntryDialogState.formCode = null;
			ObservationFormEntryDialogState.formCodeOptions = null;
			ObservationFormEntryDialogState.onSaved = null;
		}
	}

	async function openFormEntryEdit(
		row: PatientFormEntryWithRelations
	) {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId)
			return;
		const code = row.formName?.code;
		if (!code) return;
		ObservationFormEntryDialogState.entryId = row.id;
		ObservationFormEntryDialogState.visitId = visitId;
		ObservationFormEntryDialogState.branchId = visitRow.branchId;
		ObservationFormEntryDialogState.patientId = visitRow.patientId;
		ObservationFormEntryDialogState.formCode = code;
		ObservationFormEntryDialogState.formCodeOptions = null;
		ObservationFormEntryDialogState.onSaved = () =>
			reloadFormEntriesForVisit();
		const specialtyTitle = specialtyFormCodeLabel(code);
		const title =
			code === 'chief_complaint'
				? m.observation_emr_chief_complaint()
				: code === 'patient_condition'
					? m.observation_emr_patient_condition()
					: code === 'hpi'
						? msg.observation_emr_hpi()
						: code === 'physical_exam'
							? msg.observation_emr_physical_exam()
							: code.startsWith('specialty_')
								? specialtyTitle
								: code;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title,
				component: LObservationFormEntryDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadFormEntriesForVisit();
			}
		} finally {
			ObservationFormEntryDialogState.entryId = null;
			ObservationFormEntryDialogState.formCode = null;
			ObservationFormEntryDialogState.formCodeOptions = null;
			ObservationFormEntryDialogState.onSaved = null;
		}
	}

	async function handleFormEntryDelete(
		row: PatientFormEntryWithRelations
	) {
		const requiredDescription = row.description?.trim() ?? '';
		if (!requiredDescription) {
			toastService.addToast(
				'Entry description is required before inactivation. Please edit and add description first.',
				StatusColorEnum.ERROR
			);
			return;
		}
		ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
			requiredDescription;
		const result = await dialogService.open<{ confirmed?: boolean }>({
			title: m.observation_emr_form_entry_inactivate_title(),
			component: LObservationFormEntryDeleteConfirmDialogContent,
			fullScreen: false,
			modalClassName:
				'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
					null;
			}
		});
		if (!result.confirmed || !result.data?.confirmed) return;
		try {
			await apiPost('formEntry.delete', { id: row.id });
			toastSuccess(
				toastService,
				m.entity_emr_entry(),
				m.toast_action_inactivated()
			);
			await reloadFormEntriesForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleFormEntriesMove(
		rows: PatientFormEntryWithRelations[],
		toFormCode: 'chief_complaint' | 'patient_condition'
	) {
		if (rows.length === 0 || clinicalVisitReadOnly) return;
		const toMove = rows.filter((row) => row.formName?.code !== toFormCode);
		if (toMove.length === 0) return;

		isTransferringFormEntries = true;
		try {
			// Soft-delete from the source list, then recreate under the target form code.
			for (const row of toMove) {
				await apiPost('formEntry.delete', { id: row.id });
				await apiPost('formEntry.create', {
					payload: {
						branchId: row.branchId,
						patientId: row.patientId,
						visitId: row.visitId,
						description: row.description ?? null,
						statusId: row.statusId,
						formCode: toFormCode
					}
				});
			}
			toastSuccess(
				toastService,
				m.entity_emr_entry(),
				m.toast_action_saved()
			);
			await reloadFormEntriesForVisit();
		} catch (err) {
			const errMsg =
				err instanceof Error
					? err.message
					: m.observation_emr_delete_failed();
			toastService.addToast(errMsg as string, StatusColorEnum.ERROR);
		} finally {
			isTransferringFormEntries = false;
		}
	}

	function openOrderLineEdit(row: OrderDetailVisitRow) {
		if (row.lockedByClosedOpBill) {
			toastService.addToast(
				m.observation_emr_order_line_locked_op_bill(),
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!visitRow?.branchId || !hospitalId || !visitId) return;
		ObservationOrderLineDialogState.visitId = visitId;
		ObservationOrderLineDialogState.hospitalId = hospitalId;
		ObservationOrderLineDialogState.branchId = visitRow.branchId;
		ObservationOrderLineDialogState.detailId = row.id;
		ObservationOrderLineDialogState.onSaved = () =>
			reloadOrdersForVisit();
		void dialogService
			.open<{ saved?: boolean }>({
				title: m.observation_emr_edit_order_line(),
				component: LObservationOrderLineDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					ObservationOrderLineDialogState.detailId = null;
					ObservationOrderLineDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadOrdersForVisit();
				}
			})
			.finally(() => {
				ObservationOrderLineDialogState.visitId = null;
				ObservationOrderLineDialogState.hospitalId = null;
				ObservationOrderLineDialogState.branchId = null;
				ObservationOrderLineDialogState.detailId = null;
				ObservationOrderLineDialogState.onSaved = null;
			});
	}

	async function handleOrderLineDelete(row: OrderDetailVisitRow) {
		if (row.lockedByClosedOpBill) {
			toastService.addToast(
				m.observation_emr_order_line_locked_op_bill(),
				StatusColorEnum.WARNING
			);
			return;
		}
		const result = await dialogService.open<{
			cancelRemark?: string;
		}>({
			title: m.observation_emr_order_line_inactivate_title(),
			component: LObservationOrderLineDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await apiPost('orderLine.deleteDetail', {
				id: row.id,
				cancelRemark: result.data?.cancelRemark ?? ''
			});
			toastService.addToast(
				m.observation_emr_order_line_deleted(),
				StatusColorEnum.SUCCESS
			);
			await reloadOrdersForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_inactivate_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function scrollToEmrSection(sectionId: string) {
		const el = document.getElementById(sectionId);
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

</script>

<svelte:head>
	<title>{msg.observation_emr_page_title()}</title>
</svelte:head>

<div class="emr-workspace flex flex-col gap-3">
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.observation_emr_choose_visit()}
			className="z-0"
		/>
	{:else if !visitRow && !isLoadingVisit}
		<WashAlert
			type={StatusColorEnum.WARNING}
			message={m.observation_emr_visit_not_found()}
			className="z-0"
		/>
	{:else}
		<header
			class="emr-workspace-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300/60 bg-base-100/90 px-3 py-2 shadow-sm backdrop-blur-md"
		>
			<nav
				class="flex flex-wrap items-center gap-1"
				aria-label={msg.observation_emr_nav_aria()}
			>
				<button
					type="button"
					class="btn btn-ghost btn-xs cursor-pointer"
					onclick={() => scrollToEmrSection('emr-col-context')}
				>
					{msg.observation_emr_nav_context()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs cursor-pointer"
					onclick={() => scrollToEmrSection('emr-col-clinical')}
				>
					{msg.observation_emr_nav_clinical()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs cursor-pointer"
					onclick={() => scrollToEmrSection('emr-col-plan')}
				>
					{msg.observation_emr_nav_plan()}
				</button>
			</nav>
			{#if !clinicalVisitReadOnly}
				<div
					class="flex flex-wrap items-center justify-end gap-2"
					aria-label={msg.observation_emr_workspace_actions()}
				>
					{#if visitRow?.visitTypeId === VisitTypeEnum.OPD}
						<span
							class="tooltip tooltip-left"
							data-tip={pendingAdmissionOrderId != null
								? msg.observation_emr_order_ipd_pending_tip()
								: msg.observation_emr_order_ipd_send_tip()}
						>
							<WashButton
								className="btn-outline btn-sm"
								disabled={!canOrderIpdAdmission}
								onClick={() => void openOrderIpdAdmission()}
							>
								{msg.observation_emr_order_ipd_admission()}
							</WashButton>
						</span>
					{/if}
					<WashButton
						className="btn-primary btn-sm"
						disabled={isSigningClinical || isLoadingVisit}
						loading={isSigningClinical}
						loadingText=""
						onClick={handleSaveAsSigned}
					>
						{m.observation_save_as_signed()}
					</WashButton>
				</div>
			{/if}
		</header>

		<div class="emr-workspace-grid">
			{#snippet glanceRowActions(onEdit, onDelete, editDisabled, deleteDisabled)}
				<div
					class="flex shrink-0 items-center gap-0.5"
					role="group"
					aria-label={msg.observation_emr_row_actions()}
				>
					<div
						class="tooltip tooltip-left tooltip-accent"
						data-tip={m.menzies_table_tooltip_edit()}
					>
						<button
							type="button"
							class="btn btn-ghost btn-square btn-xs btn-accent"
							class:cursor-pointer={!editDisabled}
							class:cursor-not-allowed={editDisabled}
							class:btn-disabled={editDisabled}
							disabled={editDisabled}
							aria-label={m.menzies_table_tooltip_edit()}
							onclick={onEdit}
						>
							<LucidePencil className="size-3.5" />
						</button>
					</div>
					<div
						class="tooltip tooltip-left tooltip-error"
						data-tip={m.menzies_table_crud_inactivate_tooltip()}
					>
						<button
							type="button"
							class="btn btn-ghost btn-square btn-xs btn-error"
							class:cursor-pointer={!deleteDisabled}
							class:cursor-not-allowed={deleteDisabled}
							class:btn-disabled={deleteDisabled}
							disabled={deleteDisabled}
							aria-label={m.menzies_table_crud_inactivate_tooltip()}
							onclick={onDelete}
						>
							<LucideTrash2 className="size-3.5" />
						</button>
					</div>
				</div>
			{/snippet}

			<!-- Left: safety / patient context -->
			<section
				id="emr-col-context"
				class="emr-col emr-col-context"
				aria-label={msg.observation_emr_col_context_label()}
			>
				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_allergies()}
						count={allergyTotal}
						isLoading={isLoadingGrid || isLoadingAllergies || isLoadingVisit}
						isEmpty={allergies.length === 0}
						emptyMessage={m.observation_emr_allergy_empty()}
						onAdd={openAllergyAdd}
						onRefresh={() => void reloadAllergiesForVisit()}
					>
						{#snippet headerExtra()}
							<label class="sr-only" for="emr-allergy-status">{msg.observation_emr_status()}</label>
							<select
								id="emr-allergy-status"
								class="select select-bordered select-xs w-24 cursor-pointer border-ink-border"
								value={allergyColumnFilters.status ?? ''}
								onchange={(e) => {
									allergyColumnFilters = {
										...allergyColumnFilters,
										status: (e.currentTarget as HTMLSelectElement).value
									};
									allergyCurrentPage = 1;
									void fetchAllergies({ force: true });
								}}
							>
								<option value={String(StatusEnum.ACTIVE)}
									>{msg.observation_emr_status_active()}</option
								>
								<option value={String(StatusEnum.INACTIVE)}
									>{msg.observation_emr_status_inactive()}</option
								>
								<option value="">{msg.observation_emr_status()}</option>
							</select>
						{/snippet}
						{#each allergies as allergy (allergy.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium">
											{formatText(allergy.allergy?.name ?? null)}
										</div>
										<div class="text-ink-muted text-xs">
											{#if allergy.severity?.name}
												{msg.observation_emr_allergy_severity()}: {allergy.severity.name}
											{/if}
											{#if allergy.reaction}
												{#if allergy.severity?.name} · {/if}{allergy.reaction}
											{/if}
											{#if allergy.visit?.visitNo}
												 · {allergy.visit.visitNo}
											{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openAllergyEdit(allergy),
										() => void handleAllergyDelete(allergy)
									, false, false)}
								</div>
							</div>
						{/each}
						{#snippet footer()}
							{#if allergyPageCount > 1}
								<div class="flex items-center justify-between gap-2">
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										class:cursor-pointer={allergyCurrentPage > 1}
										class:cursor-not-allowed={allergyCurrentPage <= 1}
										disabled={allergyCurrentPage <= 1}
										aria-label={msg.observation_emr_prev_page()}
										onclick={() => {
											allergyCurrentPage = Math.max(1, allergyCurrentPage - 1);
											void fetchAllergies({ force: true });
										}}
									>
										<LucideChevronLeft className="size-3.5" />
									</button>
									<span class="text-ink-muted text-xs">
										{msg.observation_emr_page_of({
											page: allergyCurrentPage,
											pages: allergyPageCount
										})}
									</span>
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										class:cursor-pointer={allergyCurrentPage < allergyPageCount}
										class:cursor-not-allowed={allergyCurrentPage >= allergyPageCount}
										disabled={allergyCurrentPage >= allergyPageCount}
										aria-label={msg.observation_emr_next_page()}
										onclick={() => {
											allergyCurrentPage = Math.min(
												allergyPageCount,
												allergyCurrentPage + 1
											);
											void fetchAllergies({ force: true });
										}}
									>
										<LucideChevronRight className="size-3.5" />
									</button>
								</div>
							{/if}
						{/snippet}
					</LEmrGlanceCardPanel>
				</div>

				<section class={TableEnum.EMR_PANEL_HEIGHT}>
					<WashCard
						className="flex h-full min-h-0 flex-col overflow-hidden border border-ink-border"
					>
						<WashCardBody
							className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3"
						>
							<WashCardBodyTitle className="shrink-0 text-base font-semibold">
								{m.mo_clinical_problem_list_title()}
							</WashCardBodyTitle>
							{#if isLoadingGrid || isLoadingVisit}
								<p class="text-ink-muted text-sm">{m.loading()}</p>
							{:else if problemListRows.length === 0}
								<p class="text-ink-muted text-sm">
									{m.mo_clinical_problem_list_empty()}
								</p>
							{:else}
								<ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
									{#each problemListRows as problem (problem.id)}
										<li class="rounded-box bg-base-200/60 px-3 py-2 text-sm">
											<div class="font-medium">
												{problem.code
													? `${problem.code}: `
													: ''}{problem.description ??
													m.mo_clinical_problem_unspecified()}
											</div>
											<div class="text-ink-muted text-xs">
												{problem.diagnosisType ??
													m.mo_clinical_diagnosis_fallback()}
												{#if problem.visitNo}
													· {problem.visitNo}{/if}
											</div>
										</li>
									{/each}
								</ul>
							{/if}
						</WashCardBody>
					</WashCard>
				</section>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_vitals()}
						count={filteredVitals.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredVitals.length === 0}
						emptyMessage={msg.observation_emr_vitals_empty()}
						onAdd={openVitalAdd}
						onRefresh={() => void reloadVitalsForVisit()}
					>
						{#snippet headerExtra()}
							<label class="sr-only" for="emr-vital-status">{msg.observation_emr_status()}</label>
							<select
								id="emr-vital-status"
								class="select select-bordered select-xs w-24 cursor-pointer border-ink-border"
								value={vitalColumnFilters.status ?? 'active'}
								onchange={(e) => {
									vitalColumnFilters = {
										...vitalColumnFilters,
										status: (e.currentTarget as HTMLSelectElement).value
									};
								}}
							>
								<option value="active">{msg.observation_emr_status_active()}</option>
								<option value="inactive">{msg.observation_emr_status_inactive()}</option>
								<option value="">{msg.observation_emr_status()}</option>
							</select>
						{/snippet}
						{#each filteredVitals as vital (vital.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium">
											{formatDateTime(getVitalDisplayDate(vital))}
										</div>
										<div class="text-ink-muted text-xs">
											{vitalCardSummary(vital)}
										</div>
										{#if vital.symptom}
											<div class="mt-0.5 text-xs">{vital.symptom}</div>
										{/if}
									</div>
									{@render glanceRowActions(
										() => void openVitalEdit(vital),
										() => void handleVitalDelete(vital)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>
			</section>

			<!-- Center: clinical narrative / workbench -->
			<section
				id="emr-col-clinical"
				class="emr-col emr-col-clinical"
				aria-label={msg.observation_emr_col_clinical_label()}
			>
				<div class="emr-transfer-panel min-h-64">
					<div
						class="rounded-box border border-ink-border bg-base-100/80 p-3 shadow-sm"
					>
						<LEmrComplaintConditionTransfer
							chiefComplaintEntries={chiefComplaintEntries}
							patientConditionEntries={patientConditionEntries}
							isLoading={isLoadingGrid || isLoadingVisit}
							transferring={isTransferringFormEntries}
							readOnly={clinicalVisitReadOnly}
							onMove={handleFormEntriesMove}
							onAddComplaint={() => openFormEntryAdd('chief_complaint')}
							onAddCondition={() => openFormEntryAdd('patient_condition')}
							onEdit={(row) => void openFormEntryEdit(row)}
							onDelete={(row) => void handleFormEntryDelete(row)}
							onRefresh={() => void reloadFormEntriesForVisit()}
						/>
					</div>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={msg.observation_emr_hpi()}
						count={hpiEntries.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={hpiEntries.length === 0}
						emptyMessage={msg.observation_emr_hpi_empty()}
						onAdd={() => openFormEntryAdd('hpi')}
						onRefresh={() => void reloadFormEntriesForVisit()}
					>
						{#each hpiEntries as row (row.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium break-words">
											{formatText(row.description)}
										</div>
										<div class="text-ink-muted text-xs">
											{entryStatusLabel(row.statusId)}
											{#if row.createdAt}
												 · {formatDateTime(row.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openFormEntryEdit(row),
										() => void handleFormEntryDelete(row)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={msg.observation_emr_physical_exam()}
						count={physicalExamEntries.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={physicalExamEntries.length === 0}
						emptyMessage={msg.observation_emr_physical_exam_empty()}
						onAdd={() => openFormEntryAdd('physical_exam')}
						onRefresh={() => void reloadFormEntriesForVisit()}
					>
						{#each physicalExamEntries as row (row.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium break-words">
											{formatText(row.description)}
										</div>
										<div class="text-ink-muted text-xs">
											{entryStatusLabel(row.statusId)}
											{#if row.createdAt}
												 · {formatDateTime(row.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openFormEntryEdit(row),
										() => void handleFormEntryDelete(row)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={msg.observation_emr_specialty_case_sheet()}
						count={filteredSpecialtyEntries.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredSpecialtyEntries.length === 0}
						emptyMessage={msg.observation_emr_specialty_empty()}
						onAdd={() => openFormEntryAdd('specialty')}
						onRefresh={() => void reloadFormEntriesForVisit()}
					>
						{#snippet headerExtra()}
							<label class="sr-only" for="emr-specialty-type"
								>{msg.observation_emr_specialty_type()}</label
							>
							<select
								id="emr-specialty-type"
								class="select select-bordered select-xs max-w-[9rem] cursor-pointer border-ink-border"
								value={specialtyColumnFilters.specialtyType ?? ''}
								onchange={(e) => {
									specialtyColumnFilters = {
										...specialtyColumnFilters,
										specialtyType: (e.currentTarget as HTMLSelectElement)
											.value
									};
								}}
							>
								<option value="">{msg.observation_emr_specialty_type()}</option>
								{#each SPECIALTY_FORM_CODES as code (code)}
									<option value={code}>{specialtyFormCodeLabel(code)}</option>
								{/each}
							</select>
						{/snippet}
						{#each filteredSpecialtyEntries as row (row.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="text-ink-muted text-xs font-medium">
											{specialtyFormCodeLabel(row.formName?.code)}
										</div>
										<div class="font-medium break-words">
											{formatText(row.description)}
										</div>
										<div class="text-ink-muted text-xs">
											{entryStatusLabel(row.statusId)}
											{#if row.createdAt}
												 · {formatDateTime(row.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openFormEntryEdit(row),
										() => void handleFormEntryDelete(row)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_diagnosis()}
						count={filteredDiagnoses.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredDiagnoses.length === 0}
						emptyMessage={m.observation_emr_diagnosis_empty()}
						onAdd={openDiagnosisAdd}
						onRefresh={() => void reloadDiagnosesForVisit()}
					>
						{#snippet headerExtra()}
							<label class="sr-only" for="emr-dx-status">{msg.observation_emr_status()}</label>
							<select
								id="emr-dx-status"
								class="select select-bordered select-xs w-24 cursor-pointer border-ink-border"
								value={diagnosisColumnFilters.status ?? 'active'}
								onchange={(e) => {
									diagnosisColumnFilters = {
										...diagnosisColumnFilters,
										status: (e.currentTarget as HTMLSelectElement).value
									};
								}}
							>
								<option value="active">{msg.observation_emr_status_active()}</option>
								<option value="inactive">{msg.observation_emr_status_inactive()}</option>
								<option value="">{msg.observation_emr_status()}</option>
							</select>
						{/snippet}
						{#each filteredDiagnoses as dx (dx.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium break-words">
											{formatText(dx.description)}
										</div>
										<div class="text-ink-muted text-xs">
											{dx.diagnosisType?.name ??
												m.mo_clinical_diagnosis_fallback()}
											 · {entryStatusLabel(dx.statusId)}
											{#if dx.createdAt}
												 · {formatDateTime(dx.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openDiagnosisEdit(dx),
										() => void handleDiagnosisDelete(dx)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>
			</section>

			<!-- Right: plan / actions -->
			<section
				id="emr-col-plan"
				class="emr-col emr-col-plan"
				aria-label={msg.observation_emr_col_plan_label()}
			>
				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_casesheet()}
						count={filteredPlanOfCare.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredPlanOfCare.length === 0}
						emptyMessage={m.observation_emr_plan_of_care_empty()}
						onAdd={openPlanOfCareAdd}
						onRefresh={() => void reloadPlanOfCareForVisit()}
					>
						{#each filteredPlanOfCare as row (row.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium break-words">
											{formatText(row.note)}
										</div>
										<div class="text-ink-muted text-xs">
											{entryStatusLabel(row.statusId)}
											{#if row.createdAt}
												 · {formatDateTime(row.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openPlanOfCareEdit(row),
										() => void handlePlanOfCareDelete(row)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_progress_note()}
						count={filteredProgressNotes.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredProgressNotes.length === 0}
						emptyMessage={m.observation_emr_progress_note_empty()}
						onAdd={openProgressNoteAdd}
						onRefresh={() => void reloadProgressNoteForVisit()}
					>
						{#each filteredProgressNotes as row (row.id)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="font-medium break-words">
											{formatText(row.note)}
										</div>
										<div class="text-ink-muted text-xs">
											{entryStatusLabel(row.statusId)}
											{#if row.createdAt}
												 · {formatDateTime(row.createdAt)}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => void openProgressNoteEdit(row),
										() => void handleProgressNoteDelete(row)
									, false, false)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>

				<div class={TableEnum.EMR_PANEL_HEIGHT}>
					<LEmrGlanceCardPanel
						title={m.observation_emr_order_history()}
						count={filteredOrderLines.length}
						isLoading={isLoadingGrid || isLoadingVisit}
						isEmpty={filteredOrderLines.length === 0}
						emptyMessage={msg.observation_emr_orders_empty()}
						showAdd={true}
						addAriaLabel={msg.observation_emr_add_order_aria()}
						addDisabled={!cpoeOrderRedirectHref}
						onAdd={() => {
							if (!cpoeOrderRedirectHref) return;
							void goto(resolve(cpoeOrderRedirectHref));
						}}
						onRefresh={() => void reloadOrdersForVisit()}
					>
						{#snippet headerExtra()}
							<label class="sr-only" for="emr-order-status">{msg.observation_emr_status()}</label>
							<select
								id="emr-order-status"
								class="select select-bordered select-xs w-24 cursor-pointer border-ink-border"
								value={orderColumnFilters.lineStatus ?? 'active'}
								onchange={(e) => {
									orderColumnFilters = {
										...orderColumnFilters,
										lineStatus: (e.currentTarget as HTMLSelectElement).value
									};
								}}
							>
								<option value="active">{msg.observation_emr_status_active()}</option>
								<option value="inactive">{msg.observation_emr_status_inactive()}</option>
								<option value="">{msg.observation_emr_status()}</option>
							</select>
						{/snippet}
						{#each filteredOrderLines as line (line.id)}
							{@const locked = Boolean(line.lockedByClosedOpBill)}
							<div
								class="rounded-box border border-ink-border/60 bg-base-200/50 px-3 py-2"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-1.5">
											<span class="font-medium">
												{formatText(
													line.serviceName ?? `Service ${line.serviceId}`
												)}
											</span>
											{#if line.isUrgent}
												<span class="badge badge-warning badge-xs">
													{msg.observation_emr_order_urgent_badge()}
												</span>
											{/if}
										</div>
										<div class="text-ink-muted text-xs">
											{#if line.orderNo}{line.orderNo} · {/if}
											{formatNumberDisplay(line.serviceAmount)}
											{#if line.instruction}
												 · {line.instruction}{/if}
										</div>
									</div>
									{@render glanceRowActions(
										() => openOrderLineEdit(line),
										() => void handleOrderLineDelete(line),
										locked,
										locked
									)}
								</div>
							</div>
						{/each}
					</LEmrGlanceCardPanel>
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	.emr-workspace {
		min-width: 0;
	}

	.emr-workspace-toolbar {
		scroll-margin-top: 0.5rem;
	}

	.emr-workspace-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
		align-items: start;
	}

	.emr-col {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 1rem;
		scroll-margin-top: 4.5rem;
	}

	.emr-col > :global(*) {
		min-height: 0;
		min-width: 0;
		width: 100%;
	}

	/* Tablet: clinical | plan side by side; transfer list keeps complaint left of condition */
	@media (min-width: 768px) {
		.emr-workspace-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}

		.emr-col-context {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1rem;
		}
	}

	/* Large: true 3-column doctor workspace */
	@media (min-width: 1024px) {
		.emr-workspace-grid {
			grid-template-columns:
				minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(0, 1.1fr);
		}

		.emr-col-context {
			grid-column: auto;
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}
	}

	.emr-transfer-panel {
		min-width: 0;
		width: 100%;
	}

	@media (max-width: 767.98px) {
		.emr-col-context {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>
