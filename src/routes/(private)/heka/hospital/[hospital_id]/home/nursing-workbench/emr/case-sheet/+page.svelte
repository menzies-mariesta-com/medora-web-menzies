<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import NursingCaseSheetDocument from '$lib/component/own/local/private/heka/nursing/NursingCaseSheetDocument.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { CaseSheetGetResponse } from '$lib/model/type/heka/case-sheet.type';
	import type {
		PatientDiagnosisListRow,
		ServiceOrderDetailListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	type PatientVisitWithRelations = NonNullable<
		CaseSheetGetResponse['visitRow']
	>;
	type PatientAllergyWithRelations = CaseSheetGetResponse['allergies'][number];
	type DiagnosisWithType = CaseSheetGetResponse['visitDiagnoses'][number];
	type PatientFormEntryWithRelations =
		CaseSheetGetResponse['chiefComplaintEntries'][number];
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
	let chiefComplaintEntries = $state<PatientFormEntryWithRelations[]>([]);
	let patientConditionEntries = $state<PatientFormEntryWithRelations[]>(
		[]
	);
	let userDisplayById = $state<Record<string, string>>({});

	let isLoading = $state(false);
	let mounted = $state(false);

	const lifeCycleUtil = new LifeCycleUtil();
	lifeCycleUtil.onMount(() => {
		mounted = true;
	});
	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	function resetCaseSheetState() {
		visitRow = null;
		allergies = [];
		vitals = [];
		orderLines = [];
		visitDiagnoses = [];
		chiefComplaintEntries = [];
		patientConditionEntries = [];
		userDisplayById = {};
	}

	async function loadCaseSheet() {
		if (!visitId) {
			resetCaseSheetState();
			return;
		}

		isLoading = true;
		resetCaseSheetState();
		try {
			if (!hospitalId) return;

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/case-sheet?visitId=${visitId}`
			);
			if (!res.ok)
				throw new Error(`Failed to load case sheet (${res.status})`);
			const data = (await res.json()) as CaseSheetGetResponse;

			visitRow = (data.visitRow ?? null) as PatientVisitWithRelations | null;
			allergies = Array.isArray(data.allergies) ? data.allergies : [];
			vitals = Array.isArray(data.vitals)
				? (data.vitals as PatientDiagnosisListRow[])
				: [];
			orderLines = Array.isArray(data.orderLines)
				? (data.orderLines as OrderDetailVisitRow[])
				: [];
			visitDiagnoses = Array.isArray(data.visitDiagnoses)
				? data.visitDiagnoses
				: [];
			chiefComplaintEntries = Array.isArray(data.chiefComplaintEntries)
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
			resetCaseSheetState();
			return;
		}
		void loadCaseSheet();
	});

	function printCaseSheet() {
		globalThis.window?.print();
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
			<DaisyUiButton
				type="button"
				className="d-btn-primary d-btn-sm gap-2"
				onClick={printCaseSheet}
			>
				<LucidePrinter className="size-4" />
				{m.nursing_case_sheet_print()}
			</DaisyUiButton>
		{/if}
	</div>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={m.nursing_case_sheet_choose_visit()}
			className="z-0"
		/>
	{:else if !visitRow && !isLoading}
		<DaisyUiAlert
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
				<DaisyUiLoading className="d-loading-sm" />
				Loading case sheet…
			</div>
		{/if}
		{#if visitRow}
			<NursingCaseSheetDocument
				visitRow={visitRow as any}
				allergies={allergies as any[]}
				{vitals}
				orderLines={orderLines as any[]}
				visitDiagnoses={visitDiagnoses as any[]}
				chiefComplaintEntries={chiefComplaintEntries as any[]}
				patientConditionEntries={patientConditionEntries as any[]}
				{userDisplayById}
			/>
		{/if}
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: #fff !important;
		}

		.no-print {
			display: none !important;
		}

		.case-sheet-root {
			padding: 0 !important;
		}
	}
</style>
