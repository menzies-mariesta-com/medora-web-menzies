<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import ClinicalFormRenderer from '$lib/component/own/local/private/medora/clinical-form/ClinicalFormRenderer.svelte';
	import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const obsApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/obstetrics` : ''
	);
	const formApi = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-form` : ''
	);

	let partogramSchema = $state<ClinicalFormTemplateSchema | null>(null);
	let deliverySchema = $state<ClinicalFormTemplateSchema | null>(null);
	let partogramValues = $state<Record<string, unknown>>({});
	let deliveryValues = $state<Record<string, unknown>>({});
	let linkCSection = $state(true);
	let submitting = $state(false);

	async function loadTemplates() {
		for (const code of ['ld_partogram_v1', 'ld_delivery_record_v1']) {
			const res = await fetch(
				`${formApi}?mode=template&code=${encodeURIComponent(code)}`
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const tpl = (await res.json()) as {
				schemaJson: ClinicalFormTemplateSchema;
			};
			if (code === 'ld_partogram_v1') partogramSchema = tpl.schemaJson;
			else deliverySchema = tpl.schemaJson;
		}
	}

	$effect(() => {
		if (formApi) void loadTemplates();
	});

	async function savePartogram() {
		if (!visitId) return;
		submitting = true;
		try {
			await fetch(obsApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'ensure',
					visitId
				})
			});
			await fetch(obsApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'partogram',
					visitId,
					valuesJson: partogramValues,
					sign: true
				})
			});
			toastSuccess(toastService, msg.ld_partogram_saved_toast());
		} finally {
			submitting = false;
		}
	}

	async function saveDelivery() {
		if (!visitId) return;
		submitting = true;
		try {
			await fetch(obsApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'delivery',
					visitId,
					valuesJson: deliveryValues,
					linkCSectionCase: linkCSection
				})
			});
			toastSuccess(toastService, msg.ld_delivery_saved_toast());
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6 p-4">
	<h1 class="text-primary text-lg font-bold">{msg.ld_partogram_title()}</h1>
	{#if !visitId}
		<p class="text-error text-sm">{msg.ld_visit_required()}</p>
	{:else}
		{#if partogramSchema}
			<section>
				<h2 class="text-secondary mb-2 font-bold">{msg.ld_partogram_section()}</h2>
				<ClinicalFormRenderer schema={partogramSchema} bind:values={partogramValues} />
				<WashButton
					className="btn-primary mt-2 cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={savePartogram}
				>
					{msg.ld_save_partogram()}
				</WashButton>
			</section>
		{/if}
		{#if deliverySchema}
			<section>
				<h2 class="text-secondary mb-2 font-bold">{msg.ld_delivery_section()}</h2>
				<ClinicalFormRenderer schema={deliverySchema} bind:values={deliveryValues} />
				<label class="label cursor-pointer justify-start gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						bind:checked={linkCSection}
					/>
					<span class="label-text text-sm">{msg.ld_link_c_section_case()}</span>
				</label>
				<WashButton
					className="btn-success mt-2 cursor-pointer"
					loading={submitting}
					disabled={submitting}
					onClick={saveDelivery}
				>
					{msg.ld_save_delivery()}
				</WashButton>
			</section>
		{/if}
	{/if}
</div>
