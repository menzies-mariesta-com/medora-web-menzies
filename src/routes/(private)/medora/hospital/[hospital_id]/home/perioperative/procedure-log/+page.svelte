<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import { SurgicalCaseTypeEnum } from '$lib/model/enum/perioperative.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const caseId = $derived(Number(page.url.searchParams.get('caseId') ?? 0));
	const caseApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/surgical-case`
			: ''
	);
	const formApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-form` : ''
	);

	let caseType = $state(SurgicalCaseTypeEnum.ENDOSCOPY);
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);

	const templateCode = $derived(
		caseType === SurgicalCaseTypeEnum.CATH_LAB
			? 'procedure_log_cath_v1'
			: 'procedure_log_endoscopy_v1'
	);

	async function loadCaseAndTemplate() {
		if (!caseId || !caseApi) return;
		const cRes = await fetch(`${caseApi}?mode=detail&id=${caseId}`);
		if (!cRes.ok) await throwUserFacingHttpError(cRes);
		const c = (await cRes.json()) as { caseType: string };
		caseType = c.caseType as SurgicalCaseTypeEnum;
		const tRes = await fetch(
			`${formApi}?mode=template&code=${encodeURIComponent(templateCode)}`
		);
		if (!tRes.ok) await throwUserFacingHttpError(tRes);
		schema = (
			(await tRes.json()) as { schemaJson: ClinicalFormTemplateSchema }
		).schemaJson;
	}

	$effect(() => {
		void loadCaseAndTemplate();
	});

	async function saveLog() {
		if (!caseId) return;
		submitting = true;
		try {
			await fetch(caseApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'procedure_log',
					caseId,
					valuesJson: values,
					sign: true
				})
			});
			toastSuccess(toastService, msg.proc_log_saved_toast());
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto max-w-3xl p-4">
	<h1 class="text-primary text-lg font-bold">{msg.proc_log_title()}</h1>
	{#if !caseId}
		<p class="text-error text-sm">{msg.proc_log_case_required()}</p>
	{:else if schema}
		<ClinicalFormRenderer {schema} bind:values />
		<WashButton
			className="btn-primary mt-4 cursor-pointer"
			loading={submitting}
			disabled={submitting}
			onClick={saveLog}
		>
			{msg.proc_log_save()}
		</WashButton>
	{/if}
</div>
