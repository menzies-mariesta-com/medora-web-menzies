<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import type { HospitalPerioperativeSettingRow } from '$lib/model/type/medora/ed-workbench.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import {
		isErBedRequiredCode,
		readApiErrorCode
	} from '$lib/util/er-bed-gate.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import LEdAssignErBedDialogContent from '$lib/component/own/local/private/medora/emergency/LEdAssignErBedDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const edApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);
	const formApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-form` : ''
	);

	let settings = $state<HospitalPerioperativeSettingRow | null>(null);
	let triageSystem = $state('esi');
	let overrideReason = $state('');
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);

	const templateCode = $derived(
		triageSystem === 'mts' ? 'ed_triage_mts_v1' : 'ed_triage_esi_v1'
	);

	async function loadSettingsAndTemplate() {
		if (!edApi || !formApi) return;
		const sRes = await fetch(`${edApi}?mode=settings`);
		if (sRes.ok) {
			settings = (await sRes.json()) as HospitalPerioperativeSettingRow;
			triageSystem = settings.defaultEdTriageSystem ?? 'esi';
		}
		const tRes = await fetch(
			`${formApi}?mode=template&code=${encodeURIComponent(templateCode)}`
		);
		if (!tRes.ok) await throwUserFacingHttpError(tRes);
		const tpl = (await tRes.json()) as {
			schemaJson: ClinicalFormTemplateSchema;
		};
		schema = tpl.schemaJson;
	}

	$effect(() => {
		void templateCode;
		void loadSettingsAndTemplate();
	});

	async function openAssignBedDialog(): Promise<boolean> {
		if (!visitId) return false;
		const result = await dialogService.open({
			title: msg.ed_assign_er_bed_title(),
			component: LEdAssignErBedDialogContent,
			props: { visitId }
		});
		return result.confirmed;
	}

	async function postTriage(sign: boolean, erBedId?: number) {
		if (!visitId || !edApi) return;
		const triageRes = await fetch(edApi, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				action: 'triage',
				visitId,
				triageSystem,
				templateCode,
				valuesJson: values,
				sign,
				triageSystemOverrideReason:
					triageSystem !== settings?.defaultEdTriageSystem
						? overrideReason
						: null,
				...(erBedId != null ? { erBedId } : {})
			})
		});
		if (await redirectIfTwoFactorRequired(triageRes)) return;
		if (!triageRes.ok) {
			const code = await readApiErrorCode(triageRes);
			if (isErBedRequiredCode(code)) {
				const assigned = await openAssignBedDialog();
				if (assigned) await postTriage(sign);
				return;
			}
			await throwUserFacingHttpError(triageRes);
		}
		toastSuccess(toastService, msg.ed_triage_saved_toast());
	}

	async function submitTriage(sign: boolean) {
		if (!visitId || !edApi) return;
		submitting = true;
		try {
			const encRes = await fetch(edApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'ensure_encounter',
					visitId
				})
			});
			if (await redirectIfTwoFactorRequired(encRes)) return;
			if (!encRes.ok) await throwUserFacingHttpError(encRes);
			await postTriage(sign);
		} catch (e) {
			if (e instanceof Error) throw e;
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-4">
	<h1 class="text-primary text-lg font-bold">{msg.ed_triage_title()}</h1>
	{#if !visitId}
		<p class="text-error text-sm">{msg.ed_visit_required()}</p>
	{:else}
		<label class="form-control max-w-xs" for="ed-triage-system">
			<span class="label-text text-sm">{msg.ed_triage_system()}</span>
			<select
				id="ed-triage-system"
				class="select select-sm"
				bind:value={triageSystem}
				disabled={submitting}
			>
				<option value="esi">ESI</option>
				<option value="mts">MTS</option>
			</select>
		</label>
		{#if settings && triageSystem !== settings.defaultEdTriageSystem}
			<label class="form-control" for="ed-override-reason">
				<span class="label-text text-sm">{msg.ed_triage_override_reason()}</span>
				<WashInputField
					id="ed-override-reason"
					className="input-sm"
					bind:value={overrideReason}
				/>
			</label>
		{/if}
		{#if schema}
			<ClinicalFormRenderer {schema} bind:values />
		{/if}
		<div class="flex flex-wrap gap-2">
			<WashButton
				className="btn-primary cursor-pointer"
				loading={submitting}
				disabled={submitting}
				onClick={() => submitTriage(true)}
			>
				{msg.ed_triage_complete()}
			</WashButton>
			<WashButton
				className="btn-ghost cursor-pointer"
				loading={submitting}
				disabled={submitting}
				onClick={() => submitTriage(false)}
			>
				{msg.ed_triage_draft()}
			</WashButton>
		</div>
	{/if}
</div>
