<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import type { SurgicalCaseListRow } from '$lib/model/type/medora/surgical-case.type';
	import { SurgicalCaseStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	let {
		caseRow,
		onUpdated
	}: {
		caseRow: SurgicalCaseListRow;
		onUpdated?: () => void;
	} = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const caseApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/surgical-case`
			: ''
	);
	const formApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/clinical-form`
			: ''
	);

	let whoSchema = $state<ClinicalFormTemplateSchema | null>(null);
	let anesthesiaSchema = $state<ClinicalFormTemplateSchema | null>(null);
	let pacuSchema = $state<ClinicalFormTemplateSchema | null>(null);
	let whoValues = $state<Record<string, unknown>>({});
	let anesthesiaValues = $state<Record<string, unknown>>({});
	let pacuValues = $state<Record<string, unknown>>({});
	let implantUdi = $state('');
	let implantBatchId = $state('');
	let submitting = $state(false);

	async function loadTemplate(code: string) {
		const res = await fetch(
			`${formApi}?mode=template&code=${encodeURIComponent(code)}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		const row = (await res.json()) as {
			schemaJson: ClinicalFormTemplateSchema;
		};
		return row.schemaJson;
	}

	async function initForms() {
		if (!formApi) return;
		[whoSchema, anesthesiaSchema, pacuSchema] = await Promise.all([
			loadTemplate('who_surgical_safety_v1'),
			loadTemplate('anesthesia_record_v1'),
			loadTemplate('pacu_recovery_v1')
		]);
	}

	$effect(() => {
		if (caseRow?.id) void initForms();
	});

	async function postCase(body: Record<string, unknown>) {
		const res = await fetch(caseApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) await throwUserFacingHttpError(res);
		return res.json();
	}

	async function saveClinicalForm(input: {
		templateCode: string;
		contextType: string;
		values: Record<string, unknown>;
		sign?: boolean;
	}) {
		const res = await fetch(formApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				visitId: caseRow.visitId,
				surgicalCaseId: caseRow.id,
				templateCode: input.templateCode,
				contextType: input.contextType,
				valuesJson: input.values,
				sign: input.sign ?? true
			})
		});
		if (!res.ok) await throwUserFacingHttpError(res);
	}

	async function handlePreOpComplete() {
		submitting = true;
		try {
			await saveClinicalForm({
				templateCode: 'pre_op_assessment_v1',
				contextType: 'pre_op',
				values: { cleared: true },
				sign: true
			});
			await postCase({ action: 'pre_op_complete', caseId: caseRow.id });
			toastSuccess(toastService, msg.periop_pre_op_complete_toast());
			onUpdated?.();
		} finally {
			submitting = false;
		}
	}

	async function handleWhoSave() {
		submitting = true;
		try {
			await saveClinicalForm({
				templateCode: 'who_surgical_safety_v1',
				contextType: 'who_checklist',
				values: whoValues,
				sign: true
			});
			toastSuccess(toastService, msg.periop_who_saved_toast());
		} finally {
			submitting = false;
		}
	}

	async function handleAnesthesiaSave() {
		submitting = true;
		try {
			await saveClinicalForm({
				templateCode: 'anesthesia_record_v1',
				contextType: 'anesthesia',
				values: anesthesiaValues,
				sign: true
			});
			toastSuccess(toastService, msg.periop_anesthesia_saved_toast());
		} finally {
			submitting = false;
		}
	}

	async function handleInOr() {
		submitting = true;
		try {
			await postCase({ action: 'in_or', caseId: caseRow.id });
			onUpdated?.();
		} finally {
			submitting = false;
		}
	}

	async function handleInPacu() {
		submitting = true;
		try {
			await postCase({ action: 'in_pacu', caseId: caseRow.id });
			onUpdated?.();
		} finally {
			submitting = false;
		}
	}

	async function handlePacuComplete() {
		submitting = true;
		try {
			await postCase({
				action: 'pacu_complete',
				caseId: caseRow.id,
				visitId: caseRow.visitId,
				valuesJson: pacuValues
			});
			toastSuccess(toastService, msg.periop_pacu_complete_toast());
			onUpdated?.();
		} finally {
			submitting = false;
		}
	}

	async function handleAddImplant() {
		submitting = true;
		try {
			await postCase({
				action: 'add_implant',
				caseId: caseRow.id,
				udiRaw: implantUdi.trim() || null,
				itemBatchId: implantBatchId
					? Number(implantBatchId)
					: null
			});
			implantUdi = '';
			implantBatchId = '';
			toastSuccess(toastService, msg.periop_implant_saved_toast());
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<WashCard>
		<WashCardBody className="gap-3">
			<h2 class="card-title text-primary font-bold">{caseRow.procedureName}</h2>
			<p class="text-sm opacity-80">
				{msg.periop_case_visit_label()}: {caseRow.visitNo ?? caseRow.visitId}
			</p>
			<div class="flex flex-wrap gap-2">
				<WashButton
					className="btn-sm btn-secondary cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handlePreOpComplete}
				>
					{msg.periop_pre_op_complete()}
				</WashButton>
				<WashButton
					className="btn-sm btn-primary cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handleInOr}
				>
					{msg.periop_enter_or()}
				</WashButton>
				<WashButton
					className="btn-sm btn-accent cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handleInPacu}
				>
					{msg.periop_enter_pacu()}
				</WashButton>
			</div>
		</WashCardBody>
	</WashCard>

	{#if whoSchema}
		<WashCard>
			<WashCardBody className="gap-3">
				<h3 class="text-primary font-bold">{msg.periop_who_checklist()}</h3>
				<ClinicalFormRenderer schema={whoSchema} bind:values={whoValues} />
				<WashButton
					className="btn-primary cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handleWhoSave}
				>
					<LucideCircleCheck class="size-4" aria-hidden="true" />
					{msg.periop_sign_save()}
				</WashButton>
			</WashCardBody>
		</WashCard>
	{/if}

	{#if anesthesiaSchema}
		<WashCard>
			<WashCardBody className="gap-3">
				<h3 class="text-primary font-bold">{msg.periop_anesthesia_record()}</h3>
				<ClinicalFormRenderer
					schema={anesthesiaSchema}
					bind:values={anesthesiaValues}
				/>
				<WashButton
					className="btn-primary cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handleAnesthesiaSave}
				>
					{msg.periop_sign_save()}
				</WashButton>
			</WashCardBody>
		</WashCard>
	{/if}

	<WashCard>
		<WashCardBody className="gap-3">
			<h3 class="text-primary font-bold">{msg.periop_implants()}</h3>
			<label class="form-control max-w-md" for="implant-udi">
				<span class="label-text text-sm">{msg.periop_implant_udi()}</span>
				<input
					id="implant-udi"
					class="input input-sm"
					bind:value={implantUdi}
					disabled={submitting}
				/>
			</label>
			<label class="form-control max-w-xs" for="implant-batch">
				<span class="label-text text-sm">{msg.periop_implant_batch_id()}</span>
				<input
					id="implant-batch"
					class="input input-sm"
					bind:value={implantBatchId}
					disabled={submitting}
				/>
			</label>
			<WashButton
				className="btn-secondary btn-sm cursor-pointer"
				loading={submitting}
				disabled={submitting}
				onClick={handleAddImplant}
			>
				{msg.periop_add_implant()}
			</WashButton>
		</WashCardBody>
	</WashCard>

	{#if pacuSchema && caseRow.statusTaggingId >= SurgicalCaseStatusTaggingEnum.IN_PACU}
		<WashCard>
			<WashCardBody className="gap-3">
				<h3 class="text-primary font-bold">{msg.periop_pacu()}</h3>
				<ClinicalFormRenderer schema={pacuSchema} bind:values={pacuValues} />
				<WashButton
					className="btn-success cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={handlePacuComplete}
				>
					{msg.periop_pacu_handoff_complete()}
				</WashButton>
			</WashCardBody>
		</WashCard>
	{/if}
</div>
