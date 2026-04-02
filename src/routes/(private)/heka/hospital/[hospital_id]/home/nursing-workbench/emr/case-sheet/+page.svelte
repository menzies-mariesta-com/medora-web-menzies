<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DiagnosisWithType } from '$lib/remote/table/information-table/diagnosis.remote';
	import type { PatientAllergyWithRelations } from '$lib/remote/table/information-table/patient-allergies.remote';
	import type { PatientFormEntryWithRelations } from '$lib/remote/table/information-table/patient-form-entry.remote';
	import type { PatientVisitWithRelations } from '$lib/remote/table/information-table/patient-visit.remote';
	import { getServiceOrderDetailRowsForVisit } from '$lib/tool/remote/table/information-table/service-order-detail.http.tool.svelte';
	import { getDiagnosesByVisitId } from '$lib/tool/remote/table/information-table/diagnosis.http.tool.svelte';
	import { getPatientAllergiesByPatientIdWithRelations } from '$lib/tool/remote/table/information-table/patient-allergies.http.tool.svelte';
	import {
		getPatientFormEntriesByVisitIdAndFormCode,
	} from '$lib/tool/remote/table/information-table/patient-form-entry.http.tool.svelte';
	import { getPatientVisitByIdWithRelations } from '$lib/tool/remote/table/information-table/patient-visit.http.tool.svelte';
	import { getPatientVitalsByVisitId } from '$lib/tool/remote/table/information-table/patient-vital.http.tool.svelte';
	import type { PatientDiagnosisSchema } from '$lib/server/db/schema-type';
	import type { ServiceOrderDetailSchema } from '$lib/server/db/schema-type';
	import { m } from '$lib/paraglide/messages';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
import { getUserByIdWithStaff } from '$lib/tool/remote/table/auth-table/user.http.tool.svelte';

	type OrderDetailVisitRow = ServiceOrderDetailSchema & {
		orderNo: string | null;
		serviceName: string | null;
	};

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visitRow = $state<PatientVisitWithRelations | null>(null);
	let allergies = $state<PatientAllergyWithRelations[]>([]);
	let vitals = $state<PatientDiagnosisSchema[]>([]);
	let orderLines = $state<OrderDetailVisitRow[]>([]);
	let visitDiagnoses = $state<DiagnosisWithType[]>([]);
	let chiefComplaintEntries = $state<PatientFormEntryWithRelations[]>(
		[]
	);
	let patientConditionEntries = $state<
		PatientFormEntryWithRelations[]
	>([]);

	let isLoading = $state(false);
	let mounted = $state(false);
let userNameById = $state<Record<string, string>>({});

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

	function getVitalDisplayDate(v: PatientDiagnosisSchema): string | null {
		return v.vitalDateTime ?? v.createdAt ?? null;
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatUserName(userId: string | null | undefined): string {
		if (!userId) return '–';
		const cached = userNameById[userId];
		if (cached) return cached;
		// Fallback to id until loaded
		return userId;
	}

	function getSectionAudit(rows: {
		createdAt?: string | null;
		updatedAt?: string | null;
		createdBy?: string | null;
		updatedBy?: string | null;
	}[]): {
		enteredAt: string | null;
		enteredBy: string | null;
		updatedAt: string | null;
		updatedBy: string | null;
	} | null {
		if (!rows.length) return null;
		let enteredAt: string | null = rows[0]?.createdAt ?? null;
		let enteredBy: string | null = rows[0]?.createdBy ?? null;
		let updatedAt: string | null = rows[0]?.updatedAt ?? rows[0]?.createdAt ?? null;
		let updatedBy: string | null = rows[0]?.updatedBy ?? rows[0]?.createdBy ?? null;
		for (const row of rows) {
			if (row.createdAt && (!enteredAt || row.createdAt < enteredAt)) {
				enteredAt = row.createdAt;
				enteredBy = row.createdBy ?? enteredBy;
			}
			const candidateUpdatedAt = row.updatedAt ?? row.createdAt ?? null;
			if (candidateUpdatedAt && (!updatedAt || candidateUpdatedAt > updatedAt)) {
				updatedAt = candidateUpdatedAt;
				updatedBy = row.updatedBy ?? row.createdBy ?? updatedBy;
			}
		}
		return { enteredAt, enteredBy: enteredBy ?? null, updatedAt, updatedBy: updatedBy ?? null };
	}

	function vitalStatusLabel(row: PatientDiagnosisSchema): string {
		return row.statusId === StatusEnum.ACTIVE
			? m.nursing_case_sheet_status_active()
			: row.statusId === StatusEnum.INACTIVE
				? m.nursing_case_sheet_status_inactive()
				: `${m.observation_emr_status()} ${row.statusId ?? '–'}`;
	}

	function allergyStatusLabel(row: PatientAllergyWithRelations): string {
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
			let v: PatientVisitWithRelations | null = null;
			try {
				getPatientVisitByIdWithRelations({ id: visitId }).refresh();
				v = await getPatientVisitByIdWithRelations({ id: visitId });
			} catch {
				v = null;
			}
			visitRow = v;
			if (!v) {
				allergies = [];
				vitals = [];
				orderLines = [];
				visitDiagnoses = [];
				chiefComplaintEntries = [];
				patientConditionEntries = [];
				return;
			}

			const hospitalIdParam = v.hospitalId ?? hospitalId ?? '';

			// Preload all distinct user ids referenced in this visit's data for name display.
			const userIds = new Set<string>();

			getPatientVitalsByVisitId({ visitId }).refresh();
			getServiceOrderDetailRowsForVisit({ visitId }).refresh();
			getDiagnosesByVisitId({ visitId }).refresh();
			getPatientAllergiesByPatientIdWithRelations({
				patientId: v.patientId
			}).refresh();

			await Promise.all([
				(async () => {
					const data =
						await getPatientAllergiesByPatientIdWithRelations({
							patientId: v.patientId
						});
					const scoped = hospitalIdParam
						? data.filter(
								(row: PatientAllergyWithRelations) =>
									row.visit?.hospitalId === hospitalIdParam
							)
						: data;
					allergies = scoped.filter(
						(row: PatientAllergyWithRelations) =>
							row.statusId === StatusEnum.ACTIVE
					);
					for (const row of allergies) {
						if (row.createdBy) userIds.add(row.createdBy);
						if (row.updatedBy) userIds.add(row.updatedBy);
					}
				})(),
				(async () => {
					vitals = await getPatientVitalsByVisitId({ visitId });
					for (const row of vitals) {
						if (row.createdBy) userIds.add(row.createdBy as string);
						if (row.updatedBy) userIds.add(row.updatedBy as string);
					}
				})(),
				(async () => {
					orderLines = (await getServiceOrderDetailRowsForVisit({
						visitId
					})) as OrderDetailVisitRow[];
					for (const row of orderLines) {
						if (row.createdBy) userIds.add(row.createdBy as string);
						if (row.updatedBy) userIds.add(row.updatedBy as string);
					}
				})(),
				(async () => {
					visitDiagnoses = await getDiagnosesByVisitId({
						visitId
					});
					for (const row of visitDiagnoses) {
						if (row.createdBy) userIds.add(row.createdBy as string);
						if (row.updatedBy) userIds.add(row.updatedBy as string);
					}
				})(),
				(async () => {
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
						for (const row of chiefComplaintEntries) {
							if (row.createdBy) userIds.add(row.createdBy as string);
							if (row.updatedBy) userIds.add(row.updatedBy as string);
						}
						for (const row of patientConditionEntries) {
							if (row.createdBy) userIds.add(row.createdBy as string);
							if (row.updatedBy) userIds.add(row.updatedBy as string);
						}
					} catch {
						chiefComplaintEntries = [];
						patientConditionEntries = [];
					}
				})()
			]);

			// Load names for all collected userIds in parallel and cache them.
			if (userIds.size > 0) {
				const entries: [string, string][] = [];
				await Promise.all(
					Array.from(userIds).map(async (id) => {
						try {
							const u = await getUserByIdWithStaff({ id });
							if (!u) return;
							const name =
								u.staff?.firstName || u.name || id;
							entries.push([id, name]);
						} catch {
							// ignore failures, keep id as fallback
						}
					})
				);
				if (entries.length > 0) {
					userNameById = {
						...userNameById,
						...Object.fromEntries(entries)
					};
				}
			}
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
					<p class="case-sheet-empty">{m.nursing_case_sheet_no_entries()}</p>
				{:else}
					<ol class="case-sheet-list">
						{#each chiefComplaintEntries as row (row.id)}
							<li>
								<div>{formatText(row.description)}</div>
								<p class="case-sheet-audit">
									Entered by {formatUserName(row.createdBy as string | null)} on
									{formatDateTime(row.createdAt as string | null | undefined)}
									· Updated by {formatUserName(row.updatedBy as string | null)} on
									{formatDateTime(row.updatedAt as string | null | undefined)}
								</p>
							</li>
						{/each}
					</ol>
				{/if}
			</section>

			<section class="case-sheet-section">
				<h3>{m.observation_emr_patient_condition()}</h3>
				{#if patientConditionEntries.length === 0}
					<p class="case-sheet-empty">{m.nursing_case_sheet_no_entries()}</p>
				{:else}
					<ol class="case-sheet-list">
						{#each patientConditionEntries as row (row.id)}
							<li>
								<div>{formatText(row.description)}</div>
								<p class="case-sheet-audit">
									Entered by {formatUserName(row.createdBy as string | null)} on
									{formatDateTime(row.createdAt as string | null | undefined)}
									· Updated by {formatUserName(row.updatedBy as string | null)} on
									{formatDateTime(row.updatedAt as string | null | undefined)}
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
									Entered by {formatUserName(row.createdBy as string | null)} on
									{formatDateTime(row.createdAt as string | null | undefined)}
									· Updated by {formatUserName(row.updatedBy as string | null)} on
									{formatDateTime(row.updatedAt as string | null | undefined)}
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
									<strong>{formatText(row.allergy?.name ?? null)}</strong>
									{m.nursing_case_sheet_allergy_severity()}:
									{formatText(row.severity?.name ?? null)};
									{m.nursing_case_sheet_allergy_reaction()}:
									{formatText(row.reaction)}
								</div>
								<p class="case-sheet-audit">
									Entered by {formatUserName(row.createdBy as string | null)} on
									{formatDateTime(row.createdAt as string | null | undefined)}
									· Updated by {formatUserName(row.updatedBy as string | null)} on
									{formatDateTime(row.updatedAt as string | null | undefined)}
								</p>
							</li>
						{/each}
					</ol>
				{/if}
			</section>

			<section class="case-sheet-section">
				<h3>{m.observation_emr_vitals()}</h3>
				{#if vitals.length === 0}
					<p class="case-sheet-empty">{m.nursing_case_sheet_no_entries()}</p>
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
											>{formatVital(
												row.bpSystolic
											)}/{formatVital(row.bpDiastolic)}</td
										>
										<td>{formatVital(row.pulse)}</td>
										<td>{formatVital(row.temperature)}</td>
										<td>{formatVital(row.spO2)}</td>
										<td>
											<div>{formatVital(row.symptom)}</div>
											<p class="case-sheet-audit">
												Entered by {formatUserName(row.createdBy as string | null)} on
												{formatDateTime(row.createdAt as string | null | undefined)}
												· Updated by {formatUserName(row.updatedBy as string | null)} on
												{formatDateTime(row.updatedAt as string | null | undefined)}
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
					<p class="case-sheet-empty">{m.nursing_case_sheet_no_entries()}</p>
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
												Entered by {formatUserName(row.createdBy as string | null)} on
												{formatDateTime(row.createdAt as string | null | undefined)}
												· Updated by {formatUserName(row.updatedBy as string | null)} on
												{formatDateTime(row.updatedAt as string | null | undefined)}
											</p>
										</td>
										<td>{formatNumberDisplay(row.serviceAmount)}</td>
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
		border: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		border-radius: 0.25rem;
		font-family:
			'Georgia',
			'Times New Roman',
			serif;
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
		font-family:
			ui-sans-serif,
			system-ui,
			sans-serif;
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
		font-family:
			ui-sans-serif,
			system-ui,
			sans-serif;
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
		font-family:
			ui-sans-serif,
			system-ui,
			sans-serif;
	}

	.case-sheet-muted {
		color: color-mix(in oklab, currentColor 45%, transparent);
		font-size: 0.92em;
	}

	.case-sheet-table-wrap {
		margin-top: 0.5rem;
		overflow-x: auto;
		font-family:
			ui-sans-serif,
			system-ui,
			sans-serif;
		font-size: 0.82rem;
	}

	.case-sheet-table {
		width: 100%;
		border-collapse: collapse;
	}

	.case-sheet-table th,
	.case-sheet-table td {
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
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
		font-family:
			ui-sans-serif,
			system-ui,
			sans-serif;
	}

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

		.case-sheet-document {
			max-width: none;
			margin: 0;
			padding: 0;
			border: none;
			border-radius: 0;
			box-shadow: none;
			background: #fff;
			color: #111;
			font-size: 11pt;
		}

		.case-sheet-section {
			break-inside: avoid;
		}

		.case-sheet-table th {
			background: #f3f3f3 !important;
			print-color-adjust: exact;
		}
	}
</style>
