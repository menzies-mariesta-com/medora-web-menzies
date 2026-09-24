<script lang="ts">
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
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
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
	import LVitalRecordDialogContent from '$lib/component/own/local/private/medora/emr/LVitalRecordDialogContent.svelte';
	import LPatientAllergyDialogContent from '$lib/component/own/local/private/medora/emr/LPatientAllergyDialogContent.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
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
	import LAdmitToIpdDialogContent from '$lib/component/own/local/private/medora/ipd/LAdmitToIpdDialogContent.svelte';
	import { AdmitToIpdDialogState } from '$lib/state/admit-to-ipd-dialog.state.svelte';
	import {
		VisitTypeEnum,
		VisitStatusTaggingEnum
	} from '$lib/model/enum/db-link';
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
	import {
		vitalTextClass,
		type VitalKey
	} from '$lib/config/vital.config';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	/** Paraglide `m` typings can lag behind `messages/*.json`; messages exist at runtime. */
	const msg = m as Record<string, (inputs?: object) => string>;

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

	const cpoeOrderRedirectHref = $derived(
		hospitalId && visitId
			? `/medora/hospital/${hospitalId}/home/consultation/cpoe/order?visitId=${visitId}`
			: ''
	);

	const clinicalVisitReadOnly = $derived(
		VisitState.isClinicalVisitReadOnly
	);

	let visitRow = $state<PatientVisitRow | null>(null);

	const canAdmitToIpd = $derived(
		!!visitRow &&
			!!visitId &&
			visitRow.visitTypeId !== VisitTypeEnum.IPD &&
			visitRow.statusTaggingId !== VisitStatusTaggingEnum.CLOSED &&
			visitRow.statusTaggingId !== VisitStatusTaggingEnum.ADMITTED &&
			visitRow.statusTaggingId !== VisitStatusTaggingEnum.DISCHARGED
	);
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
	let lastHandledAllergyPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let allergyFilterDebounceTimeout: ReturnType<
		typeof setTimeout
	> | null = null;

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
		if (!res.ok) throw new Error(await res.text());
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
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	function areFiltersEqual(
		a: Record<string, string>,
		b: Record<string, string>
	): boolean {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const k of keys) {
			if ((a[k] ?? '') !== (b[k] ?? '')) return false;
		}
		return true;
	}

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});
	lifeCycleUtil.onDestroy(() => {
		mounted = false;
		if (allergyFilterDebounceTimeout) {
			clearTimeout(allergyFilterDebounceTimeout);
		}
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

	async function handleAdmitToIpd() {
		if (!visitId || !visitRow?.branchId) return;
		AdmitToIpdDialogState.visitId = visitId;
		AdmitToIpdDialogState.branchId = visitRow.branchId;
		AdmitToIpdDialogState.admittingDoctorId =
			visitRow.doctorId ?? null;
		const result = await dialogService.open({
			title: 'Admit to IPD',
			component: LAdmitToIpdDialogContent
		});
		if (result.confirmed) await refreshAllForVisit();
	}

	/** Client-side vitals status filter: values match formatted cell (lowercased). */
	const statusFilterOptions = [
		{ label: 'Active', value: 'active' },
		{ label: 'Inactive', value: 'inactive' }
	];

	/** Allergy table (remote filters): same `statusId` values as nursing OPD allergy. */
	const allergyStatusFilterOptions = [
		{ label: 'Active', value: String(StatusEnum.ACTIVE) },
		{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
	];

	const allergyColumns: MenziesTableColumn<PatientAllergyWithRelations>[] =
		[
			{
				id: 'visitNo',
				header: 'Visit No',
				widthClass: TableRowEnum.VISIT_NO_WIDTH,
				filterable: true,
				format: (_value, row) => row.visit?.visitNo?.trim() ?? '–'
			},
			{
				id: 'allergyName',
				header: 'Allergy',
				widthClass: 'min-w-[8rem]',
				filterable: false,
				format: (_value, row) => formatText(row.allergy?.name ?? null)
			},
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-28',
				filterable: true,
				filterType: 'select',
				filterOptions: allergyStatusFilterOptions,
				defaultFilterValue: String(StatusEnum.ACTIVE),
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: `Status ${row.statusId ?? 'Unknown'}`
			},
			{
				id: 'severity',
				header: 'Severity',
				widthClass: 'w-30',
				filterable: true,
				filterType: 'select',
				filterMasterKey: 'severity',
				format: (_value, row) =>
					formatText(row.severity?.name ?? null)
			},
			{
				id: 'reaction',
				header: 'Reaction',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.reaction),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'remark',
				header: 'Remark',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.remark),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'deactivationRemark',
				header: 'Deactivation remark',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatText(row.deactivationRemark),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'createdAt',
				header: 'Created',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) => formatDateTime(row.createdAt ?? null)
			},
			{
				id: 'updatedAt',
				header: 'Updated',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) => formatDateTime(row.updatedAt ?? null)
			}
		];

	const vitalColumns: MenziesTableColumn<PatientDiagnosisListRow>[] =
		[
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-28 min-w-[7rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: statusFilterOptions,
				defaultFilterValue: 'active',
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: `Status ${row.statusId ?? 'Unknown'}`
			},
			{
				id: 'date',
				header: 'Date',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) =>
					formatDateTime(getVitalDisplayDate(row) ?? null)
			},
			{
				id: 'height',
				header: 'Height (cm)',
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.height)
			},
			{
				id: 'weight',
				header: 'Weight (kg)',
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.weight)
			},
			{
				id: 'bmi',
				header: m.emr_vital_bmi(),
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.bmi),
				cellClassGetter: (row) =>
					vitalTextClass(row.bmi, 'bmi' as VitalKey)
			},
			{
				id: 'bp',
				header: 'BP (mmHg)',
				widthClass: 'w-24 min-w-[6rem]',
				filterable: false,
				format: (_value, row) =>
					`${formatVital(row.bpSystolic)}/${formatVital(
						row.bpDiastolic
					)}`,
				cellClassGetter: (row) =>
					vitalTextClass(row.bpSystolic, 'bpSystolic' as VitalKey) ||
					vitalTextClass(row.bpDiastolic, 'bpDiastolic' as VitalKey)
			},
			{
				id: 'pulse',
				header: 'P (bpm)',
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.pulse),
				cellClassGetter: (row) =>
					vitalTextClass(row.pulse, 'pulse' as VitalKey)
			},
			{
				id: 'temperature',
				header: 'T (°C)',
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.temperature),
				cellClassGetter: (row) =>
					vitalTextClass(row.temperature, 'temperature' as VitalKey)
			},
			{
				id: 'spO2',
				header: 'SpO₂ (%)',
				widthClass: 'w-20 min-w-[5rem]',
				filterable: false,
				format: (_value, row) => formatVital(row.spO2),
				cellClassGetter: (row) =>
					vitalTextClass(row.spO2, 'spO2' as VitalKey)
			},
			{
				id: 'symptom',
				header: 'Symptom',
				widthClass: 'min-w-32',
				filterable: false,
				format: (_value, row) => formatVital(row.symptom),
				cellClass: 'max-w-48 truncate'
			}
		];

	const orderColumns: MenziesTableColumn<OrderDetailVisitRow>[] = [
		{
			id: 'orderNo',
			header: 'Order No',
			widthClass: 'w-32',
			filterable: false,
			format: (_value, row) => formatText(row.orderNo)
		},
		{
			id: 'serviceName',
			header: 'Service',
			widthClass: 'min-w-[8rem]',
			filterable: false,
			format: (_value, row) =>
				formatText(row.serviceName ?? `Service ${row.serviceId}`)
		},
		{
			id: 'instruction',
			header: 'Description',
			widthClass: 'w-48',
			filterable: false,
			format: (_value, row) => formatText(row.instruction)
		},
		{
			id: 'serviceAmount',
			header: 'Amount',
			widthClass: 'w-24',
			filterable: false,
			format: (_value, row) => formatNumberDisplay(row.serviceAmount)
		},
		{
			id: 'serviceUnit',
			header: 'Unit',
			widthClass: 'w-16',
			filterable: false,
			format: (_value, row) =>
				row.serviceUnit != null ? String(row.serviceUnit) : '–'
		},
		{
			id: 'isUrgent',
			header: 'Urgent',
			widthClass: 'w-20',
			filterable: false,
			format: (_value, row) => (row.isUrgent ? 'Yes' : 'No')
		},
		{
			id: 'lineStatus',
			header: 'Status',
			widthClass: 'w-24',
			filterable: true,
			filterType: 'select',
			filterOptions: statusFilterOptions,
			defaultFilterValue: 'active',
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: '–'
		}
	];

	const diagnosisColumns: MenziesTableColumn<DiagnosisWithType>[] = [
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: statusFilterOptions,
			defaultFilterValue: 'active',
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'diagnosisType',
			header: m.observation_emr_diagnosis_type_label(),
			widthClass: 'min-w-[8rem]',
			filterable: false,
			format: (_value, row) =>
				formatText(row.diagnosisType?.name ?? null)
		},
		{
			id: 'description',
			header: 'Description',
			widthClass: 'min-w-[12rem]',
			filterable: false,
			format: (_value, row) => formatText(row.description),
			cellClass: 'max-w-64 truncate'
		},
		{
			id: 'createdAt',
			header: 'Created',
			widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) => formatDateTime(row.createdAt ?? null)
		},
		{
			id: 'updatedAt',
			header: 'Updated',
			widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) => formatDateTime(row.updatedAt ?? null)
		}
	];

	function planOfCareNotePreview(
		note: string | null | undefined
	): string {
		const t = (note ?? '').trim();
		if (!t) return '–';
		const max = 120;
		return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
	}

	const planOfCareColumns: MenziesTableColumn<PlanOfCareListRow>[] = [
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: statusFilterOptions,
			defaultFilterValue: 'active',
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'note',
			header: m.observation_emr_plan_of_care_column_note(),
			widthClass: 'min-w-[12rem]',
			filterable: false,
			format: (_value, row) => planOfCareNotePreview(row.note),
			cellClass: 'max-w-80 whitespace-normal'
		},
		{
			id: 'doctor',
			header: m.observation_emr_advising_doctor(),
			widthClass: 'min-w-[10rem]',
			filterable: false,
			format: (_value, row) =>
				row.doctor
					? StringUtil.doctorOptionDisplayName(row.doctor)
					: '–'
		},
		{
			id: 'createdAt',
			header: 'Created',
			widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) => formatDateTime(row.createdAt ?? null)
		}
	];

	const progressNoteColumns: MenziesTableColumn<ProgressNoteListRow>[] =
		[
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-28 min-w-[7rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: statusFilterOptions,
				defaultFilterValue: 'active',
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: `Status ${row.statusId ?? 'Unknown'}`
			},
			{
				id: 'note',
				header: m.observation_emr_progress_note_column_note(),
				widthClass: 'min-w-[12rem]',
				filterable: false,
				format: (_value, row) => planOfCareNotePreview(row.note),
				cellClass: 'max-w-80 whitespace-normal'
			},
			{
				id: 'doctor',
				header: m.observation_emr_advising_doctor(),
				widthClass: 'min-w-[10rem]',
				filterable: false,
				format: (_value, row) =>
					row.doctor
						? StringUtil.doctorOptionDisplayName(row.doctor)
						: '–'
			},
			{
				id: 'createdAt',
				header: 'Created',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) => formatDateTime(row.createdAt ?? null)
			}
		];

	const formEntryColumns: MenziesTableColumn<PatientFormEntryWithRelations>[] =
		[
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-28 min-w-[7rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: statusFilterOptions,
				defaultFilterValue: 'active',
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: `Status ${row.statusId ?? 'Unknown'}`
			},
			{
				id: 'description',
				header: 'Description',
				widthClass: 'min-w-[12rem]',
				filterable: false,
				format: (_value, row) => formatText(row.description),
				cellClass: 'max-w-80 truncate'
			},
			{
				id: 'createdAt',
				header: 'Created',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) => formatDateTime(row.createdAt ?? null)
			}
		];

	const specialtyColumns: MenziesTableColumn<PatientFormEntryWithRelations>[] =
		[
			{
				id: 'specialtyType',
				header: msg.observation_emr_specialty_type(),
				widthClass: 'min-w-[9rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: [
					{ value: '', label: 'All' },
					...SPECIALTY_FORM_CODES.map((code) => ({
						value: code,
						label: specialtyFormCodeLabel(code)
					}))
				],
				format: (_value, row) =>
					specialtyFormCodeLabel(row.formName?.code)
			},
			...formEntryColumns
		];

	const patientConditionColumns: MenziesTableColumn<PatientFormEntryWithRelations>[] =
		[
			{
				id: 'visitNo',
				header: 'Visit No',
				widthClass: TableRowEnum.VISIT_NO_WIDTH,
				filterable: false,
				format: (_value, row) => row.visit?.visitNo?.trim() ?? '–'
			},
			{
				id: 'visitDate',
				header: 'Visit date',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) =>
					formatDateTime(row.visit?.createdAt ?? null)
			},
			...formEntryColumns
		];

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
			hpi: 'History of present illness',
			physical_exam: 'Physical examination',
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
						? 'History of present illness'
						: code === 'physical_exam'
							? 'Physical examination'
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

	async function handleFormEntryMove(detail: {
		row: PatientFormEntryWithRelations;
		toFormCode: string;
	}) {
		const { row, toFormCode } = detail;
		const allowedFormCodes = new Set([
			'chief_complaint',
			'patient_condition'
		]);
		if (!allowedFormCodes.has(toFormCode)) return;

		const targetFormCode = toFormCode as
			| 'chief_complaint'
			| 'patient_condition';

		const currentCode = row.formName?.code;
		if (currentCode === targetFormCode) return;

		try {
			// Soft-delete from the source list, then recreate under the target form code.
			await apiPost('formEntry.delete', { id: row.id });
			await apiPost('formEntry.create', {
				payload: {
					branchId: row.branchId,
					patientId: row.patientId,
					visitId: row.visitId,
					description: row.description ?? null,
					statusId: row.statusId,
					formCode: targetFormCode
				}
			});
			toastSuccess(
				toastService,
				m.entity_emr_entry(),
				m.toast_action_saved()
			);
			await reloadFormEntriesForVisit();
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: m.observation_emr_delete_failed();
			toastService.addToast(msg as string, StatusColorEnum.ERROR);
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
</script>

<svelte:head>
	<title>Observation EMR</title>
</svelte:head>

<div class="flex flex-col gap-2">
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
		{#if !clinicalVisitReadOnly || canAdmitToIpd}
			<div class="flex justify-end gap-2">
				{#if canAdmitToIpd}
					<WashButton
						className="btn-secondary btn-sm"
						disabled={isLoadingVisit}
						onClick={handleAdmitToIpd}
					>
						Admit to IPD
					</WashButton>
				{/if}
				{#if !clinicalVisitReadOnly}
					<WashButton
						className="btn-primary btn-sm"
						disabled={isSigningClinical || isLoadingVisit}
						onClick={handleSaveAsSigned}
					>
						{isSigningClinical ? '…' : m.observation_save_as_signed()}
					</WashButton>
				{/if}
			</div>
		{/if}
		<div class="observation-emr-grid">
			{#snippet formEntryMoveRowActions(
				row,
				moveToLabel,
				moveToFormCode,
				moveDirection
			)}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText={m.menzies_table_tooltip_edit()}
						color="accent"
						onClick={() =>
							openFormEntryEdit(row as PatientFormEntryWithRelations)}
					>
						{#snippet icon()}
							<LucidePencil className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText={m.menzies_table_crud_inactivate_tooltip()}
						color="error"
						onClick={() =>
							handleFormEntryDelete(
								row as PatientFormEntryWithRelations
							)}
					>
						{#snippet icon()}
							<LucideTrash2 className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText={`move to ${moveToLabel}`.trim()}
						color="info"
						onClick={() =>
							void handleFormEntryMove({
								row: row as PatientFormEntryWithRelations,
								toFormCode: moveToFormCode
							})}
					>
						{#snippet icon()}
							{#if moveDirection === 'up'}
								<LucideChevronLeft className="size-4" />
							{:else}
								<LucideChevronRight className="size-4" />
							{/if}
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/snippet}

			<!-- Row 1: Immediate context -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_chief_complaint()}
					rows={chiefComplaintEntries}
					columns={formEntryColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={() => openFormEntryAdd('chief_complaint')}
					showRefreshButton={true}
					showRowActions={true}
					actionsVariant="none"
					crudShowView={false}
					enableColumnFilters={false}
					emptyMessage="No chief complaint entries."
					on:refresh={reloadFormEntriesForVisit}
				>
					{#snippet rowActions(row)}
						{@render formEntryMoveRowActions(
							row,
							m.observation_emr_patient_condition(),
							'patient_condition',
							'down'
						)}
					{/snippet}
				</MenziesTable>
			</div>
			<section class={TableEnum.EMR_TABLES_HEIGHT}>
				<WashCard
					className="flex h-full min-h-0 flex-col overflow-hidden"
				>
					<WashCardBody
						className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4"
					>
						<WashCardBodyTitle
							className="shrink-0 text-base font-semibold"
						>
							{m.mo_clinical_problem_list_title()}
						</WashCardBodyTitle>
						{#if isLoadingGrid || isLoadingVisit}
							<p class="text-sm opacity-60">{m.loading()}</p>
						{:else if problemListRows.length === 0}
							<p class="text-sm opacity-60">
								{m.mo_clinical_problem_list_empty()}
							</p>
						{:else}
							<ul
								class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto"
							>
								{#each problemListRows as problem (problem.id)}
									<li
										class="rounded-box bg-base-200/60 px-3 py-2 text-sm"
									>
										<div class="font-medium">
											{problem.code
												? `${problem.code} — `
												: ''}{problem.description ??
												m.mo_clinical_problem_unspecified()}
										</div>
										<div class="text-xs opacity-60">
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

			<!-- Row 2: Deep context & safety -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title="History of present illness"
					rows={hpiEntries}
					columns={formEntryColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={() => openFormEntryAdd('hpi')}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					emptyMessage="No HPI entries."
					on:refresh={reloadFormEntriesForVisit}
					on:edit={(e) =>
						openFormEntryEdit(
							e.detail as PatientFormEntryWithRelations
						)}
					on:delete={(e) =>
						handleFormEntryDelete(
							e.detail as PatientFormEntryWithRelations
						)}
				/>
			</div>
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_allergies()}
					rows={allergies}
					columns={allergyColumns}
					masterFilterHospitalId={hospitalId}
					isLoading={isLoadingGrid ||
						isLoadingAllergies ||
						isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={openAllergyAdd}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={true}
					bind:columnFilters={allergyColumnFilters}
					bind:pageSize={allergyPageSizeStr}
					bind:currentPage={allergyCurrentPage}
					totalRowCount={allergyTotal}
					emptyMessage={m.observation_emr_allergy_empty()}
					on:refresh={reloadAllergiesForVisit}
					on:pageChange={() => {
						void fetchAllergies({ force: true });
					}}
					on:pageSizeChange={() => {
						if (allergyPageSizeStr === lastHandledAllergyPageSize) {
							return;
						}
						lastHandledAllergyPageSize = allergyPageSizeStr;
						allergyCurrentPage = 1;
						void fetchAllergies({ force: true });
					}}
					on:filtersChange={(event) => {
						const nextFilters = event.detail.filters;
						if (areFiltersEqual(allergyColumnFilters, nextFilters)) {
							return;
						}
						if (allergyFilterDebounceTimeout) {
							clearTimeout(allergyFilterDebounceTimeout);
						}
						allergyColumnFilters = nextFilters;
						allergyCurrentPage = 1;
						allergyFilterDebounceTimeout = setTimeout(() => {
							void fetchAllergies({ force: true });
						}, 350);
					}}
					on:edit={(e) =>
						openAllergyEdit(e.detail as PatientAllergyWithRelations)}
					on:delete={(e) =>
						handleAllergyDelete(
							e.detail as PatientAllergyWithRelations
						)}
				/>
			</div>

			<!-- Row 3: Objective data -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title="Physical examination"
					rows={physicalExamEntries}
					columns={formEntryColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={() => openFormEntryAdd('physical_exam')}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					emptyMessage="No physical exam entries."
					on:refresh={reloadFormEntriesForVisit}
					on:edit={(e) =>
						openFormEntryEdit(
							e.detail as PatientFormEntryWithRelations
						)}
					on:delete={(e) =>
						handleFormEntryDelete(
							e.detail as PatientFormEntryWithRelations
						)}
				/>
			</div>
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_vitals()}
					rows={vitals}
					columns={vitalColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={openVitalAdd}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					bind:columnFilters={vitalColumnFilters}
					emptyMessage="No vitals for this visit."
					on:refresh={reloadVitalsForVisit}
					on:edit={(e) =>
						openVitalEdit(e.detail as PatientDiagnosisListRow)}
					on:delete={(e) =>
						handleVitalDelete(e.detail as PatientDiagnosisListRow)}
				/>
			</div>

			<!-- Row 4: Assessment -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={msg.observation_emr_specialty_case_sheet()}
					rows={filteredSpecialtyEntries}
					columns={specialtyColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={() => openFormEntryAdd('specialty')}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={true}
					bind:columnFilters={specialtyColumnFilters}
					emptyMessage={msg.observation_emr_specialty_empty()}
					on:refresh={reloadFormEntriesForVisit}
					on:filtersChange={(event) => {
						specialtyColumnFilters = event.detail.filters;
					}}
					on:edit={(e) =>
						openFormEntryEdit(
							e.detail as PatientFormEntryWithRelations
						)}
					on:delete={(e) =>
						handleFormEntryDelete(
							e.detail as PatientFormEntryWithRelations
						)}
				/>
			</div>
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_diagnosis()}
					rows={visitDiagnoses}
					columns={diagnosisColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={openDiagnosisAdd}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					bind:columnFilters={diagnosisColumnFilters}
					emptyMessage={m.observation_emr_diagnosis_empty()}
					on:refresh={reloadDiagnosesForVisit}
					on:edit={(e) =>
						openDiagnosisEdit(e.detail as DiagnosisWithType)}
					on:delete={(e) =>
						handleDiagnosisDelete(e.detail as DiagnosisWithType)}
				/>
			</div>

			<!-- Row 5: Management -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_casesheet()}
					rows={planOfCareRows}
					columns={planOfCareColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={openPlanOfCareAdd}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					bind:columnFilters={planOfCareColumnFilters}
					emptyMessage={m.observation_emr_plan_of_care_empty()}
					on:refresh={reloadPlanOfCareForVisit}
					on:edit={(e) =>
						openPlanOfCareEdit(e.detail as PlanOfCareListRow)}
					on:delete={(e) =>
						handlePlanOfCareDelete(e.detail as PlanOfCareListRow)}
				/>
			</div>
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_patient_condition()}
					rows={patientConditionEntries}
					columns={patientConditionColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={() => openFormEntryAdd('patient_condition')}
					showRefreshButton={true}
					showRowActions={true}
					actionsVariant="none"
					crudShowView={false}
					enableColumnFilters={false}
					emptyMessage="No patient condition entries."
					on:refresh={reloadFormEntriesForVisit}
				>
					{#snippet rowActions(row)}
						{@render formEntryMoveRowActions(
							row,
							m.observation_emr_chief_complaint(),
							'chief_complaint',
							'up'
						)}
					{/snippet}
				</MenziesTable>
			</div>

			<!-- Row 6: Action & notes -->
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_progress_note()}
					rows={progressNoteRows}
					columns={progressNoteColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={true}
					addLabel="Add"
					onAdd={openProgressNoteAdd}
					showRefreshButton={true}
					actionsVariant="crud"
					crudShowView={false}
					enableColumnFilters={false}
					bind:columnFilters={progressNoteColumnFilters}
					emptyMessage={m.observation_emr_progress_note_empty()}
					on:refresh={reloadProgressNoteForVisit}
					on:edit={(e) =>
						openProgressNoteEdit(e.detail as ProgressNoteListRow)}
					on:delete={(e) =>
						handleProgressNoteDelete(e.detail as ProgressNoteListRow)}
				/>
			</div>
			<div class={TableEnum.EMR_TABLES_HEIGHT}>
				<MenziesTable
					title={m.observation_emr_order_history()}
					rows={orderLines}
					columns={orderColumns}
					isLoading={isLoadingGrid || isLoadingVisit}
					fillParent={true}
					showAddButton={false}
					showRefreshButton={true}
					showRowActions={true}
					actionsVariant="crud"
					crudShowView={false}
					crudEditDisabled={(row) =>
						Boolean((row as OrderDetailVisitRow).lockedByClosedOpBill)}
					crudDeleteDisabled={(row) =>
						Boolean((row as OrderDetailVisitRow).lockedByClosedOpBill)}
					enableColumnFilters={true}
					bind:columnFilters={orderColumnFilters}
					emptyMessage="No order lines for this visit."
					on:refresh={reloadOrdersForVisit}
					on:edit={(e) =>
						openOrderLineEdit(e.detail as OrderDetailVisitRow)}
					on:delete={(e) =>
						handleOrderLineDelete(e.detail as OrderDetailVisitRow)}
				>
					{#snippet headerActions()}
						<WashButton
							className="btn-ghost btn-xs btn-square"
							disabled={!cpoeOrderRedirectHref}
							onClick={() => {
								if (!cpoeOrderRedirectHref) return;
								void goto(resolve(cpoeOrderRedirectHref));
							}}
						>
							<LucidePlus className="size-3.5" />
						</WashButton>
					{/snippet}
				</MenziesTable>
			</div>
		</div>
	{/if}
</div>

<style>
	.observation-emr-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
		align-items: stretch;
	}

	.observation-emr-grid > :global(*) {
		min-height: 0;
		min-width: 0;
		width: 100%;
	}

	@media (min-width: 1024px) {
		.observation-emr-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
