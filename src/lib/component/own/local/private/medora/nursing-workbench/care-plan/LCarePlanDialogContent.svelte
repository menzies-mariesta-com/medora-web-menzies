<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { untrack } from 'svelte';
	import type {
		CarePlanContent,
		NursingCarePlanInstanceRow,
		NursingCarePlanTemplateRow
	} from '$lib/model/type/medora/clinical-platform.type';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { can } from '$lib/state/page-permission.state.svelte';
	import { mergeCarePlanDefaults } from '$lib/tool/nursing/care-plan.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	let {
		confirm,
		cancel,
		apiBase,
		visitId,
		templates,
		instance = null,
		/** A revision writes a new copy and retires `instance`. */
		revising = false
	}: DialogSlotProps & {
		apiBase: string;
		visitId: string;
		templates: NursingCarePlanTemplateRow[];
		instance?: NursingCarePlanInstanceRow | null;
		revising?: boolean;
	} = $props();

	const isSignedCopy = $derived(
		Boolean(instance?.isSigned) && !revising
	);
	const readOnly = $derived(isSignedCopy);
	const isEdit = $derived(Boolean(instance) && !revising);
	/** POST needs CREATE; editing and revising both PUT, which needs EDIT. */
	const requiredAction = $derived(
		instance ? PageActionEnum.EDIT : PageActionEnum.CREATE
	);

	/** Editing pins the template: content fields belong to the schema it was written with. */
	const templateOptions = $derived(
		templates.map((tpl) => ({
			value: String(tpl.id),
			label: tpl.title
		}))
	);
	let templateId = $state(
		untrack(() =>
			String(instance?.templateId ?? templates[0]?.id ?? '')
		)
	);
	const template = $derived(
		templates.find((tpl) => String(tpl.id) === templateId) ?? null
	);
	let values = $state<CarePlanContent>(
		untrack(() =>
			mergeCarePlanDefaults(
				template?.sectionsJson,
				(instance?.contentJson ?? {}) as CarePlanContent
			)
		)
	);
	let isSaving = $state(false);

	function pickTemplate(next: string | undefined) {
		templateId = next ?? '';
		// A new plan starts from the template's prefill; the previous one is discarded.
		values = mergeCarePlanDefaults(
			templates.find((tpl) => String(tpl.id) === templateId)
				?.sectionsJson
		);
	}

	async function save(sign: boolean) {
		if (isSaving || readOnly || !template) return;
		isSaving = true;
		try {
			// A revision must go through PUT: POST would create a plan and leave
			// the signed original active, silently duplicating it.
			const res = await fetch(apiBase, {
				method: isEdit || revising ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					visitId,
					templateId: template.id,
					contentJson: values,
					sign,
					id: isEdit ? instance?.id : undefined,
					supersedesId: revising ? instance?.id : undefined
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastSuccess(toastService, msg.care_plan_saved());
			await confirm({ saved: true });
		} catch (err) {
			toastService.addErrorToast(
				msg.care_plan_save_failed(),
				err instanceof Error ? err : undefined
			);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex min-h-0 flex-1 flex-col px-4">
	<!-- Only this band scrolls; header and WashDialogFooter stay pinned.
	     Horizontal inset lives on this column (WashDialogFooter cancels it with -mx-4). -->
	<div class="min-h-0 flex-1 overflow-y-auto py-3">
		<div class="flex flex-col gap-4">
			{#if templates.length === 0}
				<p class="text-sm text-warning">
					{msg.care_plan_no_templates()}
				</p>
			{:else}
				<label class="block w-full" for="care-plan-template">
					<span class="label-ink mb-1 block text-sm"
						>{msg.care_plan_template_picker_title()}</span
					>
					<WashSelect
						id="care-plan-template"
						className="select-sm w-full"
						options={templateOptions}
						value={templateId}
						disabled={readOnly || instance !== null}
						onChange={(value) => pickTemplate(value)}
					/>
				</label>
				{#if template}
					<ClinicalFormRenderer
						schema={template.sectionsJson}
						bind:values
						{readOnly}
						idPrefix="care-plan"
					/>
				{/if}
			{/if}
		</div>
	</div>
	<WashDialogFooter>
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={() => cancel()}
			disabled={isSaving}
		>
			{msg.cancel()}
		</WashButton>
		{#if !readOnly && template}
			<WashButton
				type="button"
				className="btn-outline"
				loading={isSaving}
				disabled={isSaving || !can(requiredAction)}
				onClick={() => void save(false)}
			>
				{msg.care_plan_save_draft()}
			</WashButton>
			<WashButton
				type="button"
				className="btn-primary"
				loading={isSaving}
				disabled={isSaving || !can(requiredAction)}
				onClick={() => void save(true)}
			>
				{msg.care_plan_sign()}
			</WashButton>
		{/if}
	</WashDialogFooter>
</div>
