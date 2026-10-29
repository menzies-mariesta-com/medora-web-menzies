<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const formApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-form` : ''
	);

	const TEMPLATE_CODE = 'ed_mlc_documentation_v1';
	let schema = $state<ClinicalFormTemplateSchema | null>(null);
	let values = $state<Record<string, unknown>>({});
	let loading = $state(true);
	let submitting = $state(false);

	async function loadTemplate() {
		if (!formApi) return;
		loading = true;
		try {
			const res = await fetch(
				`${formApi}?mode=template&code=${encodeURIComponent(TEMPLATE_CODE)}`,
				{ credentials: 'include' }
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const tpl = (await res.json()) as {
				schemaJson?: ClinicalFormTemplateSchema;
			};
			schema = tpl.schemaJson ?? null;
		} finally {
			loading = false;
		}
	}

	async function save() {
		if (!formApi || !visitId || submitting) return;
		submitting = true;
		try {
			const res = await fetch(formApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					visitId,
					templateCode: TEMPLATE_CODE,
					contextType: 'mlc',
					valuesJson: values,
					sign: true
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.ed_reg_mlc_saved?.() ?? 'MLC documentation saved',
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Save failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => {
		void loadTemplate();
	});
</script>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-lg font-bold">
		{msg.ed_reg_mlc_dialog_title?.() ?? 'MLC documentation'}
	</h1>
	{#if !visitId}
		<p class="text-sm opacity-70">
			{msg.ed_visit_required?.() ??
				'Select a visit from the bar above to document MLC.'}
		</p>
	{:else if loading}
		<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
	{:else if !schema}
		<p class="text-warning text-sm">
			{msg.ed_reg_mlc_missing_template?.() ?? 'MLC template not available.'}
		</p>
	{:else}
		<ClinicalFormRenderer {schema} bind:values />
		<WashButton
			className="btn btn-primary cursor-pointer self-start"
			loading={submitting}
			disabled={submitting}
			onClick={() => void save()}
		>
			{m.save?.() ?? 'Save'}
		</WashButton>
	{/if}
</div>
