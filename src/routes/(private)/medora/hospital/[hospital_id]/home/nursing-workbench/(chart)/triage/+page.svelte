<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import LEdVisitRequiredAlert from '$lib/component/own/local/private/medora/visit/LEdVisitRequiredAlert.svelte';
	import LEdAssignErBedDialogContent from '$lib/component/own/local/private/medora/emergency/LEdAssignErBedDialogContent.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import type {
		EdEncounterBoardRow,
		EdTriageCurrentRow,
		HospitalPerioperativeSettingRow
	} from '$lib/model/type/medora/ed-workbench.type';
	import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { VitalEnum } from '$lib/model/enum/vital.enum';
	import {
		getVitalPlaceholder,
		type VitalKey
	} from '$lib/config/vital.config';
	import { HOSPITAL_COLOR_CATEGORY } from '$lib/model/const/color-purpose.const';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { can } from '$lib/state/page-permission.state.svelte';
	import {
		badgeInlineStyleFromColor,
		resolveHospitalColor
	} from '$lib/tool/color/hospital-color-resolve.util';
	import { loadHospitalColorMap } from '$lib/util/hospital-color-map-client.util';
	import { parseUtcInstant } from '$lib/util/utc-instant.util';
	import { parseUuid } from '$lib/util/id.util';
	import {
		isErBedRequiredCode,
		readApiErrorCode
	} from '$lib/util/er-bed-gate.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		parseUuid(page.url.searchParams.get('visitId') ?? '') ?? ''
	);
	const triageApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/triage`
			: ''
	);

	const vitalFields: {
		key: string;
		label: () => string;
		vital: VitalKey;
	}[] = [
		{
			key: 'pulse',
			label: msg.ed_triage_vital_pulse,
			vital: VitalEnum.PULSE
		},
		{
			key: 'respiration',
			label: msg.ed_triage_vital_respiration,
			vital: VitalEnum.RESPIRATION
		},
		{
			key: 'bpSystolic',
			label: msg.ed_triage_vital_bp_systolic,
			vital: VitalEnum.BP_SYSTOLIC
		},
		{
			key: 'bpDiastolic',
			label: msg.ed_triage_vital_bp_diastolic,
			vital: VitalEnum.BP_DIASTOLIC
		},
		{
			key: 'spO2',
			label: msg.ed_triage_vital_spo2,
			vital: VitalEnum.SP_O2
		},
		{
			key: 'temperature',
			label: msg.ed_triage_vital_temperature,
			vital: VitalEnum.TEMPERATURE
		}
	];

	let queue = $state<EdEncounterBoardRow[]>([]);
	let queueLoading = $state(false);
	let queueError = $state(false);
	let panel = $state<'loading' | 'ready' | 'error'>('loading');
	let settings = $state<HospitalPerioperativeSettingRow | null>(null);
	let current = $state<EdTriageCurrentRow | null>(null);
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	let triageSystem = $state('esi');
	let overrideReason = $state('');
	let values = $state<Record<string, unknown>>({});
	let gcs = $state('');
	let painScore = $state('');
	let vitals = $state<Record<string, string>>({
		pulse: '',
		respiration: '',
		bpSystolic: '',
		bpDiastolic: '',
		spO2: '',
		temperature: ''
	});
	let submitting = $state(false);
	let colorMap = $state<Record<string, string> | null>(null);

	const templateCode = $derived(
		triageSystem === 'mts' ? 'ed_triage_mts_v1' : 'ed_triage_esi_v1'
	);
	const signed = $derived(Boolean(current?.signed));
	const doorToTriageMinutes = $derived.by(() => {
		const arrived = parseUtcInstant(current?.arrivedAt);
		if (!Number.isFinite(arrived)) return null;
		const end = parseUtcInstant(current?.triagedAt) || Date.now();
		return Math.max(0, Math.floor((end - arrived) / 60000));
	});

	function templateUrl(code: string): string {
		return `${triageApi}?mode=template&code=${encodeURIComponent(code)}`;
	}

	const queueColumns: MenziesTableColumn<EdEncounterBoardRow>[] = [
		{
			id: 'patientName',
			header: msg.ed_triage_col_patient(),
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			filterable: false,
			format: (_value, row) =>
				row.patientName ?? msg.ed_unknown_patient()
		},
		{
			id: 'visitNo',
			header: msg.visit_history_visit_label_visit_no(),
			widthClass: TableRowEnum.VISIT_NO_WIDTH,
			filterable: false,
			format: (_value, row) => row.visitNo?.trim() || '–'
		},
		{
			id: 'chiefComplaint',
			header: msg.ed_triage_col_complaint(),
			widthClass: 'min-w-48',
			filterable: false,
			format: (_value, row) => row.chiefComplaint?.trim() || '–'
		},
		{
			id: 'waitMinutes',
			header: msg.ed_triage_col_wait(),
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			cellClass: 'text-warning',
			format: (_value, row) =>
				msg.ed_wait_minutes({ minutes: String(row.waitMinutes) })
		}
	];

	async function getJson<T>(
		url: string,
		signal?: AbortSignal
	): Promise<T> {
		const res = await fetch(url, { credentials: 'include', signal });
		if (!res.ok) await throwUserFacingHttpError(res);
		return (await res.json()) as T;
	}

	async function loadQueue() {
		queueError = false;
		queueLoading = true;
		try {
			queue = await getJson<EdEncounterBoardRow[]>(
				`${triageApi}?mode=queue`
			);
		} catch (e) {
			queueError = true;
			toastService.addErrorToast(msg.ed_triage_queue_failed(), e);
		} finally {
			queueLoading = false;
		}
	}

	/** An aborted read is a navigation/unmount, never a user-facing failure. */
	function isAbortError(e: unknown): boolean {
		return e instanceof DOMException && e.name === 'AbortError';
	}

	async function loadPanel(signal?: AbortSignal) {
		panel = 'loading';
		try {
			const [setting, state] = await Promise.all([
				getJson<HospitalPerioperativeSettingRow>(
					`${triageApi}?mode=settings`,
					signal
				),
				getJson<EdTriageCurrentRow>(
					`${triageApi}?mode=current&visitId=${visitId}`,
					signal
				)
			]);
			const system =
				state.triageSystem ?? setting.defaultEdTriageSystem ?? 'esi';
			const tpl = await getJson<{
				schemaJson: ClinicalFormTemplateSchema;
			}>(
				templateUrl(
					system === 'mts' ? 'ed_triage_mts_v1' : 'ed_triage_esi_v1'
				),
				signal
			);
			settings = setting;
			current = state;
			triageSystem = system;
			values = { ...state.values };
			gcs = String(state.values.gcs ?? '');
			painScore = String(state.values.pain_score ?? '');
			overrideReason = String(
				state.values.triage_system_override_reason ?? ''
			);
			schema = tpl.schemaJson;
			panel = 'ready';
		} catch (e) {
			if (signal?.aborted || isAbortError(e)) return;
			panel = 'error';
			toastService.addErrorToast(msg.ed_triage_setup_failed(), e);
		}
	}

	/** Re-triage must not carry the other system's acuity (stale `mts_category`). */
	async function switchSystem(next?: string) {
		const system = next === 'mts' ? 'mts' : 'esi';
		if (system === triageSystem && schema) return;
		triageSystem = system;
		values = {};
		try {
			const tpl = await getJson<{
				schemaJson: ClinicalFormTemplateSchema;
			}>(
				templateUrl(
					system === 'mts' ? 'ed_triage_mts_v1' : 'ed_triage_esi_v1'
				)
			);
			schema = tpl.schemaJson;
		} catch (e) {
			toastService.addErrorToast(msg.ed_triage_setup_failed(), e);
		}
	}

	$effect(() => {
		if (!hospitalId || !triageApi) return;
		void loadHospitalColorMap(hospitalId)
			.catch(() => null)
			.then((map) => (colorMap = map));
		if (!visitId) {
			void loadQueue();
			return;
		}
		const ac = new AbortController();
		void loadPanel(ac.signal);
		return () => ac.abort();
	});

	function openQueueVisit(row: EdEncounterBoardRow) {
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
		void goto(`${page.url.pathname}?visitId=${row.visitId}`);
	}

	function acuityBadgeStyle(
		level: string | null | undefined
	): string | undefined {
		if (!level?.trim()) return undefined;
		return badgeInlineStyleFromColor(
			resolveHospitalColor(
				colorMap,
				HOSPITAL_COLOR_CATEGORY.ED_TRIAGE_LEVEL,
				level.trim()
			)
		);
	}

	async function assignBed(): Promise<boolean> {
		const result = await dialogService.open({
			title: msg.ed_assign_er_bed_title(),
			component: LEdAssignErBedDialogContent,
			props: { visitId }
		});
		return result.confirmed;
	}

	async function postTriage(action: 'triage' | 'draft' | 'amend') {
		if (!triageApi || !visitId || submitting) return;
		submitting = true;
		try {
			const res = await fetch(triageApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action,
					visitId,
					triageSystem,
					templateCode,
					valuesJson: { ...values, gcs, pain_score: painScore },
					triageSystemOverrideReason:
						triageSystem !== settings?.defaultEdTriageSystem
							? overrideReason
							: null,
					vitals: Object.fromEntries(
						Object.entries(vitals).filter(([, v]) => v.trim() !== '')
					)
				})
			});
			if (await redirectIfTwoFactorRequired(res)) return;
			if (!res.ok) {
				const code = await readApiErrorCode(res);
				// Resus is the only bed-gated outcome: assign in the dialog, then retry once.
				if (isErBedRequiredCode(code)) {
					if (await assignBed()) await postTriage(action);
					return;
				}
				if (code === ApiErrorCodeEnum.ED_TRIAGE_ALREADY_SIGNED) {
					toastService.addErrorToast(msg.ed_triage_already_signed());
					return;
				}
				await throwUserFacingHttpError(res);
			}
			toastService.addSuccessToast(
				action === 'draft'
					? msg.ed_triage_draft_saved_toast()
					: msg.ed_triage_saved_toast()
			);
			if (action !== 'draft') {
				vitals = {
					pulse: '',
					respiration: '',
					bpSystolic: '',
					bpDiastolic: '',
					spO2: '',
					temperature: ''
				};
				gcs = '';
				painScore = '';
			}
			await loadPanel();
		} catch (e) {
			toastService.addErrorToast(msg.ed_triage_save_failed(), e);
		} finally {
			submitting = false;
		}
	}

	const canWrite = $derived(can(PageActionEnum.CREATE));

	/** Template fields bucketed by layout role; ESI and MTS order them differently. */
	const TEMPLATE_ACUITY_FIELD_IDS = [
		'esi_level',
		'mts_category'
	] as const;
	const TEMPLATE_NOTES_FIELD_IDS = [
		'chief_complaint',
		'triage_notes'
	] as const;

	function schemaWithFields(
		ids: readonly string[]
	): ClinicalFormTemplateSchema | null {
		if (!schema) return null;
		const wanted = ids as string[];
		const fields = schema.sections.filter((f) =>
			wanted.includes(f.id)
		);
		return fields.length > 0 ? { sections: fields } : null;
	}

	const mainSchema = $derived.by(() => {
		if (!schema) return null;
		const hoisted = [
			...TEMPLATE_ACUITY_FIELD_IDS,
			...TEMPLATE_NOTES_FIELD_IDS
		] as string[];
		const fields = schema.sections.filter(
			(f) => !hoisted.includes(f.id)
		);
		return fields.length > 0 ? { sections: fields } : null;
	});
	const acuitySchema = $derived(
		schemaWithFields(TEMPLATE_ACUITY_FIELD_IDS)
	);
	const notesSchema = $derived(
		schemaWithFields(TEMPLATE_NOTES_FIELD_IDS)
	);
</script>

<svelte:head>
	<title>{msg.ed_triage_title()}</title>
</svelte:head>

<div class="flex flex-col gap-4 p-2">
	{#if !visitId}
		<h1 class="text-xl font-bold text-primary">
			{msg.ed_triage_title()}
		</h1>
		{#if queueError}
			<WashAlert
				type={StatusColorEnum.ERROR}
				message={msg.ed_triage_queue_failed()}
			>
				{#snippet trailing()}
					<WashButton
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => void loadQueue()}
					>
						{msg.visit_gate_retry()}
					</WashButton>
				{/snippet}
			</WashAlert>
		{:else}
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					title={msg.ed_triage_queue_title()}
					rows={queue}
					columns={queueColumns}
					isLoading={queueLoading}
					showRefreshButton={true}
					emptyMessage={msg.ed_triage_queue_empty()}
					showRowActions={true}
					actionsHeader={msg.actions()}
					actionsVariant="none"
					on:refresh={() => void loadQueue()}
				>
					{#snippet rowActions(row)}
						<MenziesTableIconAction
							tooltipText={msg.ed_triage_open()}
							color="primary"
							onClick={() =>
								openQueueVisit(row as EdEncounterBoardRow)}
						>
							{#snippet icon()}
								<LucideChevronRight className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{/snippet}
				</MenziesTable>
			</div>
		{/if}
	{:else}
		<LEdVisitRequiredAlert {hospitalId} {visitId}>
			{#if panel === 'loading'}
				<WashAlert
					type={StatusColorEnum.INFO}
					message={msg.loading()}
				/>
			{:else if panel === 'error'}
				<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
					<WashAlert
						type={StatusColorEnum.ERROR}
						message={msg.ed_triage_setup_failed()}
						className="z-0 min-w-0 flex-1"
					/>
					<WashButton
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => void loadPanel()}
					>
						{msg.visit_gate_retry()}
					</WashButton>
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					<div
						class="flex flex-wrap items-center justify-between gap-3"
					>
						<h1 class="text-xl font-bold text-primary">
							{msg.ed_triage_title()}
						</h1>
						<div class="flex flex-wrap items-center gap-2">
							{#if current?.acuityLevel}
								<span
									class="badge badge-sm"
									style={acuityBadgeStyle(current.acuityLevel)}
								>
									{msg.ed_triage_acuity()}
									{current.acuityLevel}
								</span>
							{/if}
							{#if doorToTriageMinutes != null}
								<span class="text-sm">
									{msg.ed_triage_door_to_triage({
										minutes: String(doorToTriageMinutes)
									})}
								</span>
							{/if}
							{#if current?.triagedAt}
								<span class="text-sm opacity-70">
									{msg.ed_triage_signed_by({
										name:
											current.triagedByName ??
											msg.ed_unknown_patient(),
										at: new Date(
											parseUtcInstant(current.triagedAt)
										).toLocaleString()
									})}
								</span>
							{/if}
						</div>
					</div>

					{#if schema}
						<WashCard>
							<WashCardBody className="gap-4">
								<fieldset
									class="flex min-w-0 flex-col gap-4"
									disabled={submitting}
								>
									<div class="flex flex-col gap-2">
										<h2 class="label-ink text-sm">
											{msg.ed_triage_vitals_title()}
										</h2>
										<div
											class="grid grid-cols-2 gap-3 md:grid-cols-4"
										>
											{#each vitalFields as field (field.key)}
												<div class="flex min-w-0 flex-col gap-1">
													<label
														class="label-ink mb-1 block text-sm"
														for="ed-triage-{field.key}"
														>{field.label()}</label
													>
													<WashInputField
														id="ed-triage-{field.key}"
														className="input-sm w-full"
														inputType="number"
														inputPlaceholderText={getVitalPlaceholder(
															field.vital
														)}
														bind:value={vitals[field.key]}
													/>
												</div>
											{/each}
											<div class="flex min-w-0 flex-col gap-1">
												<label
													class="label-ink mb-1 block text-sm"
													for="ed-triage-gcs"
													>{msg.ed_triage_gcs()}</label
												>
												<WashInputField
													id="ed-triage-gcs"
													className="input-sm w-full"
													inputType="number"
													bind:value={gcs}
												/>
											</div>
											<div class="flex min-w-0 flex-col gap-1">
												<label
													class="label-ink mb-1 block text-sm"
													for="ed-triage-pain"
													>{msg.ed_triage_pain()}</label
												>
												<WashInputField
													id="ed-triage-pain"
													className="input-sm w-full"
													inputType="number"
													bind:value={painScore}
												/>
											</div>
										</div>
									</div>

									{#if settings && triageSystem !== settings.defaultEdTriageSystem}
										<div class="flex min-w-0 flex-col gap-1">
											<label
												class="label-ink mb-1 block text-sm"
												for="ed-override-reason"
												>{msg.ed_triage_override_reason()}</label
											>
											<WashInputField
												id="ed-override-reason"
												className="input-sm w-full"
												bind:value={overrideReason}
											/>
										</div>
									{/if}

									{#if mainSchema}
										<ClinicalFormRenderer
											schema={mainSchema}
											bind:values
											className="grid gap-3 md:grid-cols-2"
											idPrefix="ed-triage-main"
										/>
									{/if}

									<!-- Triage system beside the level it sets. -->
									<div
										class="flex flex-col gap-3 sm:flex-row sm:items-start"
									>
										<div class="flex min-w-0 flex-col gap-1 sm:w-56">
											<label
												class="label-ink mb-1 block text-sm"
												for="ed-triage-system"
												>{msg.ed_triage_system()}</label
											>
											<WashSelect
												id="ed-triage-system"
												className="select-sm w-full"
												options={[
													{ value: 'esi', label: 'ESI' },
													{ value: 'mts', label: 'MTS' }
												]}
												value={triageSystem}
												onChange={(next) => void switchSystem(next)}
												disabled={submitting}
											/>
										</div>
										{#if acuitySchema}
											<div class="min-w-0 flex-1">
												<ClinicalFormRenderer
													schema={acuitySchema}
													bind:values
													className="flex flex-col"
													idPrefix="ed-triage-acuity"
												/>
											</div>
										{/if}
									</div>

									<!-- Free text at the foot of the form, side by side. -->
									{#if notesSchema}
										<ClinicalFormRenderer
											schema={notesSchema}
											bind:values
											className="grid gap-3 md:grid-cols-2"
											idPrefix="ed-triage-notes"
										/>
									{/if}
								</fieldset>
								<div class="flex flex-wrap gap-2">
									{#if signed}
										<WashButton
											variant="primary"
											className="cursor-pointer"
											loading={submitting}
											disabled={submitting || !canWrite}
											onClick={() => void postTriage('amend')}
										>
											{msg.ed_triage_amend()}
										</WashButton>
									{:else}
										<WashButton
											variant="primary"
											className="cursor-pointer"
											loading={submitting}
											disabled={submitting || !canWrite}
											onClick={() => void postTriage('triage')}
										>
											{msg.ed_triage_complete()}
										</WashButton>
										<WashButton
											variant="ghost"
											className="cursor-pointer"
											loading={submitting}
											disabled={submitting || !canWrite}
											onClick={() => void postTriage('draft')}
										>
											{msg.ed_triage_draft()}
										</WashButton>
									{/if}
								</div>
							</WashCardBody>
						</WashCard>
					{/if}
				</div>
			{/if}
		</LEdVisitRequiredAlert>
	{/if}
</div>
