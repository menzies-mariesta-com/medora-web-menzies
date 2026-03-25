<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import ObservationCardTable from '$lib/component/global/private/heka/observation/ObservationCardTable.svelte';
	import ObservationStubCard from '$lib/component/global/private/heka/observation/ObservationStubCard.svelte';
	import LObservationPatientDocumentDialogContent from '$lib/component/local/private/heka/observation/LObservationPatientDocumentDialogContent.svelte';
	import LObservationOrderLineDialogContent from '$lib/component/local/private/heka/observation/LObservationOrderLineDialogContent.svelte';
	import LObservationDiagnosisDialogContent from '$lib/component/local/private/heka/observation/LObservationDiagnosisDialogContent.svelte';
	import LObservationFormEntryDialogContent from '$lib/component/local/private/heka/observation/LObservationFormEntryDialogContent.svelte';
	import LObservationDiagnosisDeleteConfirmDialogContent from '$lib/component/local/private/heka/observation/LObservationDiagnosisDeleteConfirmDialogContent.svelte';
	import LObservationFormEntryDeleteConfirmDialogContent from '$lib/component/local/private/heka/observation/LObservationFormEntryDeleteConfirmDialogContent.svelte';
	import LVitalRecordDialogContent from '$lib/component/local/private/heka/emr/LVitalRecordDialogContent.svelte';
	import LPatientAllergyDialogContent from '$lib/component/local/private/heka/emr/LPatientAllergyDialogContent.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { ObservationPatientDocumentDialogState } from '$lib/state/observation-patient-document-dialog.state.svelte';
	import { ObservationOrderLineDialogState } from '$lib/state/observation-order-line-dialog.state.svelte';
	import { ObservationDiagnosisDialogState } from '$lib/state/observation-diagnosis-dialog.state.svelte';
	import { ObservationDiagnosisDeleteConfirmDialogState } from '$lib/state/observation-diagnosis-delete-confirm-dialog.state.svelte';
	import { ObservationFormEntryDialogState } from '$lib/state/observation-form-entry-dialog.state.svelte';
	import { ObservationFormEntryDeleteConfirmDialogState } from '$lib/state/observation-form-entry-delete-confirm-dialog.state.svelte';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getPatientAllergiesByPatientIdWithRelationsPaginated,
		getPatientAllergiesByPatientIdWithRelations,
		deletePatientAllergies,
		type PatientAllergyWithRelations
	} from '$lib/remote/table/information-table/patient-allergies.remote';
	import {
		getPatientVitalsByVisitId,
		deletePatientVital
	} from '$lib/remote/table/information-table/patient-vital.remote';
	import { getServiceOrderDetailRowsForVisit } from '$lib/remote/table/information-table/service-order-detail.remote';
	import { deleteServiceOrderDetail } from '$lib/remote/table/information-table/service-order-detail.remote';
	import {
		getPatientDocumentsByVisitIdWithRelations,
		deletePatientDocument,
		type PatientDocumentWithRelations
	} from '$lib/remote/table/information-table/patient-document.remote';
	import {
		getDiagnosesByVisitId,
		deleteDiagnosis,
		type DiagnosisWithType
	} from '$lib/remote/table/information-table/diagnosis.remote';
	import {
		getPatientFormEntriesByVisitIdAndFormCode,
		deletePatientFormEntry,
		type PatientFormEntryWithRelations
	} from '$lib/remote/table/information-table/patient-form-entry.remote';
	import type { PatientDiagnosisSchema } from '$lib/server/db/schema-type';
	import type { ServiceOrderDetailSchema } from '$lib/server/db/schema-type';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import {
		vitalTextClass,
		type VitalKey
	} from '$lib/config/vital.config';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';

	type OrderDetailVisitRow = ServiceOrderDetailSchema & {
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

	let visitRow = $state<Awaited<
		ReturnType<typeof getPatientVisitById>
	> | null>(null);
	let allergies = $state<PatientAllergyWithRelations[]>([]);
	let vitals = $state<PatientDiagnosisSchema[]>([]);
	let orderLines = $state<OrderDetailVisitRow[]>([]);
	let documents = $state<PatientDocumentWithRelations[]>([]);
	let visitDiagnoses = $state<DiagnosisWithType[]>([]);
	let chiefComplaintEntries = $state<PatientFormEntryWithRelations[]>([]);
	let patientConditionEntries = $state<PatientFormEntryWithRelations[]>([]);

	let isLoadingVisit = $state(false);
	let isLoadingGrid = $state(false);
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
	let allergyPageSizeStr = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let allergyCurrentPage = $state(1);
	let allergyTotal = $state(0);
	let lastAllergiesFetchKey = $state('');
	let lastHandledAllergyPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let allergyFilterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

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

	function getVitalDisplayDate(v: PatientDiagnosisSchema): string | null {
		return v.vitalDateTime ?? v.createdAt ?? null;
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatNumber(
		value: number | string | null | undefined
	): string {
		if (value == null || value === '') return '–';
		const n = Number(value);
		if (!Number.isFinite(n)) return String(value);
		return n.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		});
	}

	async function fetchAllergies(
		options?: { force?: boolean; skipRowLoading?: boolean }
	) {
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
			const params = {
				patientId,
				hospitalId: hospitalIdParam,
				page: allergyCurrentPage,
				pageSize,
				visitNo: allergyColumnFilters.visitNo?.trim() || undefined,
				severityName: allergyColumnFilters.severity?.trim() || undefined,
				statusId:
					statusId != null && Number.isFinite(statusId)
						? statusId
						: undefined
			};
			getPatientAllergiesByPatientIdWithRelationsPaginated(
				params
			).refresh();
			const result =
				await getPatientAllergiesByPatientIdWithRelationsPaginated(
					params
				);
			allergies = result.data;
			allergyTotal = result.total;
		} catch {
			const data = await getPatientAllergiesByPatientIdWithRelations({
				patientId
			});
			const filtered = hospitalIdParam
				? data.filter(
						(row) => row.visit?.hospitalId === hospitalIdParam
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
			getPatientVisitById({ id: visitId }).refresh();
			getPatientVitalsByVisitId({ visitId }).refresh();
			getServiceOrderDetailRowsForVisit({ visitId }).refresh();
			getPatientDocumentsByVisitIdWithRelations({ visitId }).refresh();

			let v: Awaited<ReturnType<typeof getPatientVisitById>> | null = null;
			try {
				v = await getPatientVisitById({ id: visitId });
			} catch {
				visitRow = null;
				allergies = [];
				allergyTotal = 0;
				vitals = [];
				orderLines = [];
				documents = [];
				visitDiagnoses = [];
				chiefComplaintEntries = [];
				patientConditionEntries = [];
				return;
			}
			visitRow = v;
			if (!v) {
				allergies = [];
				allergyTotal = 0;
				vitals = [];
				orderLines = [];
				documents = [];
				return;
			}
			getPatientAllergiesByPatientIdWithRelations({
				patientId: v.patientId
			}).refresh();
			await Promise.all([
				fetchAllergies({ force: true, skipRowLoading: true }),
				(async () => {
					vitals = await getPatientVitalsByVisitId({ visitId });
				})(),
				(async () => {
					orderLines = (await getServiceOrderDetailRowsForVisit({
						visitId
					})) as OrderDetailVisitRow[];
				})(),
				(async () => {
					documents =
						await getPatientDocumentsByVisitIdWithRelations({
							visitId
						});
				})(),
				(async () => {
					visitDiagnoses = await getDiagnosesByVisitId({
						visitId
					});
				})(),
				(async () => {
					try {
						chiefComplaintEntries =
							await getPatientFormEntriesByVisitIdAndFormCode({
								visitId,
								formCode: 'chief_complaint'
							});
						patientConditionEntries =
							await getPatientFormEntriesByVisitIdAndFormCode({
								visitId,
								formCode: 'patient_condition'
							});
					} catch {
						chiefComplaintEntries = [];
						patientConditionEntries = [];
					}
				})()
			]);
		} finally {
			isLoadingGrid = false;
		}
	}

	/** Same refresh strategy as nursing OPD allergy (patient-wide list). */
	async function reloadAllergiesForVisit() {
		if (!visitRow?.patientId) return;
		await fetchAllergies({ force: true });
	}

	async function reloadVitalsForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			getPatientVitalsByVisitId({ visitId }).refresh();
			vitals = await getPatientVitalsByVisitId({ visitId });
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadOrdersForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			getServiceOrderDetailRowsForVisit({ visitId }).refresh();
			orderLines = await getServiceOrderDetailRowsForVisit({
				visitId
			});
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadDocumentsForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			getPatientDocumentsByVisitIdWithRelations({ visitId }).refresh();
			documents = await getPatientDocumentsByVisitIdWithRelations({
				visitId
			});
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadDiagnosesForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			getDiagnosesByVisitId({ visitId }).refresh();
			visitDiagnoses = await getDiagnosesByVisitId({ visitId });
		} finally {
			isLoadingGrid = false;
		}
	}

	async function reloadFormEntriesForVisit() {
		if (!visitId) return;
		isLoadingGrid = true;
		try {
			try {
				getPatientFormEntriesByVisitIdAndFormCode({
					visitId,
					formCode: 'chief_complaint'
				}).refresh();
				getPatientFormEntriesByVisitIdAndFormCode({
					visitId,
					formCode: 'patient_condition'
				}).refresh();
				chiefComplaintEntries =
					await getPatientFormEntriesByVisitIdAndFormCode({
						visitId,
						formCode: 'chief_complaint'
					});
				patientConditionEntries =
					await getPatientFormEntriesByVisitIdAndFormCode({
						visitId,
						formCode: 'patient_condition'
					});
			} catch {
				chiefComplaintEntries = [];
				patientConditionEntries = [];
			}
		} finally {
			isLoadingGrid = false;
		}
	}

	$effect(() => {
		if (!mounted) return;
		if (!visitId) {
			visitRow = null;
			allergies = [];
			allergyTotal = 0;
			allergyCurrentPage = 1;
			lastAllergiesFetchKey = '';
			vitals = [];
			orderLines = [];
			documents = [];
			visitDiagnoses = [];
			chiefComplaintEntries = [];
			patientConditionEntries = [];
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

	async function openCaseSheetInfo() {
		await dialogService.open({
			title: m.observation_emr_casesheet_stub_title(),
			message: `${m.observation_emr_casesheet_coming()}\n\n${m.observation_emr_casesheet_stub()}`,
			variant: DialogVariantEnum.ALERT
		});
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

	function getAllergySeverityFilterOptions() {
		const names = Array.from(
			new Set(
				allergies
					.map((row) => row.severity?.name)
					.filter((name): name is string => !!name)
			)
		);
		return names.map((name) => ({ label: name, value: name }));
	}

	const allergyColumns: MariTableColumn<PatientAllergyWithRelations>[] =
		[
			{
				id: 'visitNo',
				header: 'Visit No',
				widthClass: 'w-40',
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
				filterOptionsGetter: getAllergySeverityFilterOptions,
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
				format: (_value, row) =>
					formatText(row.deactivationRemark),
				cellClass: 'max-w-48 truncate'
			},
			{
				id: 'createdAt',
				header: 'Created',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) =>
					formatDateTime(row.createdAt ?? null)
			},
			{
				id: 'updatedAt',
				header: 'Updated',
				widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
				filterable: false,
				format: (_value, row) =>
					formatDateTime(row.updatedAt ?? null)
			}
		];

	const vitalColumns: MariTableColumn<PatientDiagnosisSchema>[] = [
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

	const orderColumns: MariTableColumn<OrderDetailVisitRow>[] = [
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
			format: (_value, row) => formatNumber(row.serviceAmount)
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
			filterable: false,
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: '–'
		}
	];

	const documentColumns: MariTableColumn<PatientDocumentWithRelations>[] =
		[
			{
				id: 'docLabel',
				header: 'Document',
				widthClass: 'min-w-[10rem]',
				filterable: false,
				format: (_value, row) => {
					const d = row.document;
					return formatText(
						[d?.code, d?.documentNumber]
							.filter(Boolean)
							.join(' · ') ||
							(d?.id != null ? `ID ${d.id}` : null)
					);
				}
			},
			{
				id: 'docType',
				header: 'Type',
				widthClass: 'w-32',
				filterable: false,
				format: (_value, row) =>
					formatText(row.document?.documentType?.documentType ?? null)
			},
			{
				id: 'status',
				header: 'Status',
				widthClass: 'w-24',
				filterable: false,
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: '–'
			},
			{
				id: 'createdAt',
				header: 'Linked',
				widthClass: 'w-36',
				filterable: false,
				format: (_value, row) =>
					formatDateTime(row.createdAt ?? null)
			}
		];

	const diagnosisColumns: MariTableColumn<DiagnosisWithType>[] = [
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
			format: (_value, row) =>
				formatDateTime(row.createdAt ?? null)
		},
		{
			id: 'updatedAt',
			header: 'Updated',
			widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) =>
				formatDateTime(row.updatedAt ?? null)
		}
	];

	const formEntryColumns: MariTableColumn<PatientFormEntryWithRelations>[] = [
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
			format: (_value, row) =>
				formatDateTime(row.createdAt ?? null)
		}
	];

	async function openAllergyAdd() {
		if (!visitRow?.patientId || !visitId) return;
		PatientAllergyDialogState.patientId = visitRow.patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.patientAllergyId = null;
		PatientAllergyDialogState.onSaved = () => reloadAllergiesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadAllergiesForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadAllergiesForVisit();
			}
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function openAllergyEdit(row: PatientAllergyWithRelations) {
		if (!visitRow?.patientId) return;
		PatientAllergyDialogState.patientId = visitRow.patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.patientAllergyId = row.id;
		PatientAllergyDialogState.onSaved = () => reloadAllergiesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadAllergiesForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadAllergiesForVisit();
			}
		} finally {
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function handleAllergyDelete(row: PatientAllergyWithRelations) {
		const result = await dialogService.open({
			title: 'Remove allergy',
			message: `Remove "${row.allergy?.name ?? 'this allergy'}" from patient? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientAllergies({ id: row.id });
			toastService.addToast(
				'Allergy removed.',
				StatusColorEnum.SUCCESS
			);
			await reloadAllergiesForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function openVitalAdd() {
		if (!visitRow?.patientId || !visitRow.hospitalId || !visitId) return;
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
					VitalRecordDialogState.vitalId = null;
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadVitalsForVisit();
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

	async function openVitalEdit(v: PatientDiagnosisSchema) {
		if (!visitRow?.patientId || !visitRow.hospitalId || !visitId) return;
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
				},
				onConfirm: (data) => {
					if (data?.saved) void reloadVitalsForVisit();
				}
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadVitalsForVisit();
			}
		} finally {
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function handleVitalDelete(v: PatientDiagnosisSchema) {
		const result = await dialogService.open({
			title: 'Delete vital',
			message: `Delete vital record from ${formatDateTime(getVitalDisplayDate(v) ?? null)}?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientVital({ id: v.id });
			toastService.addToast('Vital deleted.', StatusColorEnum.SUCCESS);
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
		if (!visitRow?.patientId || !visitRow.branchId || !visitId) return;
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
		if (!visitRow?.patientId || !visitRow.branchId || !visitId) return;
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
				'Diagnosis description is required before delete. Please edit and add description first.',
				StatusColorEnum.ERROR
			);
			return;
		}
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
			requiredDescription;
		const result = await dialogService.open<{ confirmed?: boolean }>({
			title: 'Delete diagnosis',
			component: LObservationDiagnosisDeleteConfirmDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
					null;
			}
		});
		if (!result.confirmed || !result.data?.confirmed) return;
		try {
			await deleteDiagnosis({ id: row.id });
			toastService.addToast(
				'Diagnosis inactivated.',
				StatusColorEnum.SUCCESS
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

	async function openFormEntryAdd(formCode: 'chief_complaint' | 'patient_condition') {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId) return;
		ObservationFormEntryDialogState.entryId = null;
		ObservationFormEntryDialogState.visitId = visitId;
		ObservationFormEntryDialogState.branchId = visitRow.branchId;
		ObservationFormEntryDialogState.patientId = visitRow.patientId;
		ObservationFormEntryDialogState.formCode = formCode;
		ObservationFormEntryDialogState.onSaved = () => reloadFormEntriesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title:
					formCode === 'chief_complaint'
						? m.observation_emr_chief_complaint()
						: m.observation_emr_patient_condition(),
				component: LObservationFormEntryDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
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
			ObservationFormEntryDialogState.onSaved = null;
		}
	}

	async function openFormEntryEdit(row: PatientFormEntryWithRelations) {
		if (!visitRow?.patientId || !visitRow.branchId || !visitId) return;
		const code = row.formName?.code;
		if (!code) return;
		ObservationFormEntryDialogState.entryId = row.id;
		ObservationFormEntryDialogState.visitId = visitId;
		ObservationFormEntryDialogState.branchId = visitRow.branchId;
		ObservationFormEntryDialogState.patientId = visitRow.patientId;
		ObservationFormEntryDialogState.formCode = code;
		ObservationFormEntryDialogState.onSaved = () => reloadFormEntriesForVisit();
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title:
					code === 'chief_complaint'
						? m.observation_emr_chief_complaint()
						: m.observation_emr_patient_condition(),
				component: LObservationFormEntryDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
			});
			if (result?.confirmed && result.data?.saved) {
				await reloadFormEntriesForVisit();
			}
		} finally {
			ObservationFormEntryDialogState.entryId = null;
			ObservationFormEntryDialogState.formCode = null;
			ObservationFormEntryDialogState.onSaved = null;
		}
	}

	async function handleFormEntryDelete(row: PatientFormEntryWithRelations) {
		const requiredDescription = row.description?.trim() ?? '';
		if (!requiredDescription) {
			toastService.addToast(
				'Entry description is required before delete. Please edit and add description first.',
				StatusColorEnum.ERROR
			);
			return;
		}
		ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
			requiredDescription;
		const result = await dialogService.open<{ confirmed?: boolean }>({
			title: 'Delete entry',
			component: LObservationFormEntryDeleteConfirmDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
					null;
			}
		});
		if (!result.confirmed || !result.data?.confirmed) return;
		try {
			await deletePatientFormEntry({ id: row.id });
			toastService.addToast('Entry deleted.', StatusColorEnum.SUCCESS);
			await reloadFormEntriesForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function openOrderLineAdd() {
		if (!visitRow?.branchId || !hospitalId || !visitId) return;
		ObservationOrderLineDialogState.visitId = visitId;
		ObservationOrderLineDialogState.hospitalId = hospitalId;
		ObservationOrderLineDialogState.branchId = visitRow.branchId;
		ObservationOrderLineDialogState.detailId = null;
		ObservationOrderLineDialogState.onSaved = () => reloadOrdersForVisit();
		void dialogService.open<{ saved?: boolean }>({
			title: m.observation_emr_add_order_line(),
			component: LObservationOrderLineDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationOrderLineDialogState.detailId = null;
				ObservationOrderLineDialogState.onSaved = null;
			},
			onConfirm: (data) => {
				if (data?.saved) void reloadOrdersForVisit();
			}
		}).finally(() => {
			ObservationOrderLineDialogState.visitId = null;
			ObservationOrderLineDialogState.hospitalId = null;
			ObservationOrderLineDialogState.branchId = null;
			ObservationOrderLineDialogState.detailId = null;
			ObservationOrderLineDialogState.onSaved = null;
		});
	}

	function openOrderLineEdit(row: OrderDetailVisitRow) {
		if (!visitRow?.branchId || !hospitalId || !visitId) return;
		ObservationOrderLineDialogState.visitId = visitId;
		ObservationOrderLineDialogState.hospitalId = hospitalId;
		ObservationOrderLineDialogState.branchId = visitRow.branchId;
		ObservationOrderLineDialogState.detailId = row.id;
		ObservationOrderLineDialogState.onSaved = () => reloadOrdersForVisit();
		void dialogService.open<{ saved?: boolean }>({
			title: m.observation_emr_edit_order_line(),
			component: LObservationOrderLineDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationOrderLineDialogState.detailId = null;
				ObservationOrderLineDialogState.onSaved = null;
			},
			onConfirm: (data) => {
				if (data?.saved) void reloadOrdersForVisit();
			}
		}).finally(() => {
			ObservationOrderLineDialogState.visitId = null;
			ObservationOrderLineDialogState.hospitalId = null;
			ObservationOrderLineDialogState.branchId = null;
			ObservationOrderLineDialogState.detailId = null;
			ObservationOrderLineDialogState.onSaved = null;
		});
	}

	async function handleOrderLineDelete(row: OrderDetailVisitRow) {
		const result = await dialogService.open({
			title: 'Delete order line',
			message: m.observation_emr_delete_order_line(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceOrderDetail({ id: row.id });
			toastService.addToast(
				m.observation_emr_order_line_deleted(),
				StatusColorEnum.SUCCESS
			);
			await reloadOrdersForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}

	function openDocumentAdd() {
		if (!visitRow?.patientId || !visitId) return;
		ObservationPatientDocumentDialogState.visitId = visitId;
		ObservationPatientDocumentDialogState.patientId = visitRow.patientId;
		ObservationPatientDocumentDialogState.patientDocumentId = null;
		ObservationPatientDocumentDialogState.onSaved = () =>
			reloadDocumentsForVisit();
		void dialogService.open<{ saved?: boolean }>({
			title: m.observation_emr_add_document_link(),
			component: LObservationPatientDocumentDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationPatientDocumentDialogState.patientDocumentId =
					null;
				ObservationPatientDocumentDialogState.onSaved = null;
			},
			onConfirm: (data) => {
				if (data?.saved) void reloadDocumentsForVisit();
			}
		}).finally(() => {
			ObservationPatientDocumentDialogState.visitId = null;
			ObservationPatientDocumentDialogState.patientId = null;
			ObservationPatientDocumentDialogState.patientDocumentId = null;
			ObservationPatientDocumentDialogState.onSaved = null;
		});
	}

	function openDocumentEdit(row: PatientDocumentWithRelations) {
		if (!visitRow?.patientId || !visitId) return;
		ObservationPatientDocumentDialogState.visitId = visitId;
		ObservationPatientDocumentDialogState.patientId = visitRow.patientId;
		ObservationPatientDocumentDialogState.patientDocumentId = row.id;
		ObservationPatientDocumentDialogState.onSaved = () =>
			reloadDocumentsForVisit();
		void dialogService.open<{ saved?: boolean }>({
			title: m.observation_emr_edit_document_link(),
			component: LObservationPatientDocumentDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto',
			onClose: () => {
				ObservationPatientDocumentDialogState.patientDocumentId =
					null;
				ObservationPatientDocumentDialogState.onSaved = null;
			},
			onConfirm: (data) => {
				if (data?.saved) void reloadDocumentsForVisit();
			}
		}).finally(() => {
			ObservationPatientDocumentDialogState.visitId = null;
			ObservationPatientDocumentDialogState.patientId = null;
			ObservationPatientDocumentDialogState.patientDocumentId = null;
			ObservationPatientDocumentDialogState.onSaved = null;
		});
	}

	function openDocumentView(row: PatientDocumentWithRelations) {
		// "View" currently reuses the same dialog as edit.
		// If you later add a dedicated read-only dialog, swap it here.
		openDocumentEdit(row);
	}

	async function handleDocumentDelete(row: PatientDocumentWithRelations) {
		const result = await dialogService.open({
			title: 'Remove document link',
			message: m.observation_emr_delete_document(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientDocument({ id: row.id });
			toastService.addToast(
				m.observation_emr_document_deleted(),
				StatusColorEnum.SUCCESS
			);
			await reloadDocumentsForVisit();
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_delete_failed()) as string,
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<svelte:head>
	<title>Observation EMR</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={m.observation_emr_choose_visit()}
			className="z-0"
		/>
	{:else if isLoadingVisit && !visitRow}
		<div class="flex min-h-32 items-center justify-center">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else if !visitRow}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message={m.observation_emr_visit_not_found()}
			className="z-0"
		/>
	{:else}
		<div class="observation-emr-grid">
			<ObservationCardTable
				title={m.observation_emr_chief_complaint()}
				rows={chiefComplaintEntries}
				columns={formEntryColumns}
				isLoading={isLoadingGrid}
				crudShowView={false}
				showRefreshButton={true}
				enableColumnFilters={true}
				emptyMessage="No chief complaint entries."
				on:add={() => openFormEntryAdd('chief_complaint')}
				on:refresh={reloadFormEntriesForVisit}
				on:edit={(e) => openFormEntryEdit(e.detail)}
				on:delete={(e) => handleFormEntryDelete(e.detail)}
			/>
			<ObservationCardTable
				title={m.observation_emr_patient_condition()}
				rows={patientConditionEntries}
				columns={formEntryColumns}
				isLoading={isLoadingGrid}
				crudShowView={false}
				showRefreshButton={true}
				enableColumnFilters={true}
				emptyMessage="No patient condition entries."
				on:add={() => openFormEntryAdd('patient_condition')}
				on:refresh={reloadFormEntriesForVisit}
				on:edit={(e) => openFormEntryEdit(e.detail)}
				on:delete={(e) => handleFormEntryDelete(e.detail)}
			/>
			<ObservationCardTable
				title={m.observation_emr_diagnosis()}
				rows={visitDiagnoses}
				columns={diagnosisColumns}
				isLoading={isLoadingGrid}
				crudShowView={false}
				showRefreshButton={true}
				emptyMessage={m.observation_emr_diagnosis_empty()}
				enableColumnFilters={true}
				bind:columnFilters={diagnosisColumnFilters}
				on:add={openDiagnosisAdd}
				on:refresh={reloadDiagnosesForVisit}
				on:edit={(e) => openDiagnosisEdit(e.detail)}
				on:delete={(e) => handleDiagnosisDelete(e.detail)}
			/>

			<ObservationCardTable
				title={m.observation_emr_allergies()}
				rows={allergies}
				columns={allergyColumns}
				isLoading={isLoadingGrid || isLoadingAllergies}
				crudShowView={false}
				showRefreshButton={true}
				enableColumnFilters={true}
				useRemoteFilters={true}
				bind:columnFilters={allergyColumnFilters}
				bind:pageSize={allergyPageSizeStr}
				bind:currentPage={allergyCurrentPage}
				totalRowCount={allergyTotal}
				emptyMessage={m.observation_emr_allergy_empty()}
				on:add={openAllergyAdd}
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
				on:edit={(e) => openAllergyEdit(e.detail)}
				on:delete={(e) => handleAllergyDelete(e.detail)}
			/>

			<ObservationCardTable
				title={m.observation_emr_vitals()}
				cardClassName="observation-emr-span-2"
				tableWrapClassName="max-h-96 min-h-0"
				rows={vitals}
				columns={vitalColumns}
				isLoading={isLoadingGrid}
				crudShowView={false}
				showRefreshButton={true}
				emptyMessage="No vitals for this visit."
				enableColumnFilters={true}
				bind:columnFilters={vitalColumnFilters}
				on:add={openVitalAdd}
				on:refresh={reloadVitalsForVisit}
				on:edit={(e) => openVitalEdit(e.detail)}
				on:delete={(e) => handleVitalDelete(e.detail)}
			/>

			<ObservationCardTable
				title={m.observation_emr_order_history()}
				rows={orderLines}
				columns={orderColumns}
				isLoading={isLoadingGrid}
				crudShowView={false}
				showRefreshButton={true}
				emptyMessage="No order lines for this visit."
				on:add={openOrderLineAdd}
				on:refresh={reloadOrdersForVisit}
				on:edit={(e) => openOrderLineEdit(e.detail)}
				on:delete={(e) => handleOrderLineDelete(e.detail)}
			/>
			<ObservationStubCard
				title={m.observation_emr_casesheet()}
				message={m.observation_emr_casesheet_stub()}
				onAdd={openCaseSheetInfo}
			/>
			<ObservationCardTable
				title={m.observation_emr_document_history()}
				rows={documents}
				columns={documentColumns}
				isLoading={isLoadingGrid}
				rowActionsVariant="view"
				showRefreshButton={true}
				emptyMessage="No documents linked to this visit."
				on:add={openDocumentAdd}
				on:refresh={reloadDocumentsForVisit}
				on:view={(e) => openDocumentView(e.detail)}
			/>
		</div>
	{/if}
</div>

<style>
	.observation-emr-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	.observation-emr-grid > :global(*) {
		min-height: 0;
		min-width: 0;
	}

	:global(.observation-emr-grid .observation-bento-card) {
		min-height: 12rem;
	}

	@media (min-width: 1280px) {
		.observation-emr-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		:global(.observation-emr-grid .observation-emr-span-2) {
			grid-column: span 2;
		}
	}
</style>