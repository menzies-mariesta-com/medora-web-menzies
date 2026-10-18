<script lang="ts">
	import type {
		ClinicalFormFieldDef,
		ClinicalFormTemplateSchema
	} from '$lib/model/type/medora/clinical-form.type';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		schema,
		values = $bindable({} as Record<string, unknown>),
		readOnly = false,
		idPrefix = 'cfe'
	}: {
		schema: ClinicalFormTemplateSchema;
		values?: Record<string, unknown>;
		readOnly?: boolean;
		idPrefix?: string;
	} = $props();

	function fieldId(field: ClinicalFormFieldDef): string {
		return `${idPrefix}-${field.id}`;
	}

	function enumOptions(field: ClinicalFormFieldDef) {
		return (field.options ?? []).map((o) => ({
			value: o.value,
			label: o.label
		}));
	}

	function strVal(id: string): string {
		return String(values[id] ?? '');
	}

	function setStr(id: string, v: string) {
		values[id] = v;
	}

	function boolVal(id: string): boolean {
		return Boolean(values[id]);
	}

	function setBool(id: string, v: boolean) {
		values[id] = v;
	}
</script>

{#snippet fieldControl(field: ClinicalFormFieldDef)}
	{#if field.type === 'boolean'}
		<label class="label cursor-pointer justify-start gap-2" for={fieldId(field)}>
			<input
				id={fieldId(field)}
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={boolVal(field.id)}
				disabled={readOnly}
				onchange={(e) => setBool(field.id, e.currentTarget.checked)}
			/>
			<span class="label-text">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
		</label>
	{:else if field.type === 'enum'}
		<label class="form-control w-full max-w-md" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<WashSelect
				id={fieldId(field)}
				className="select-sm w-full"
				placeholder={msg.periop_form_select()}
				options={enumOptions(field)}
				value={strVal(field.id)}
				onChange={(v) => setStr(field.id, v ?? '')}
				disabled={readOnly}
			/>
		</label>
	{:else if field.type === 'textarea'}
		<label class="form-control w-full" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<WashTextarea
				id={fieldId(field)}
				className="textarea-sm w-full"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{:else if field.type === 'number'}
		<label class="form-control w-full max-w-xs" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<WashInputField
				id={fieldId(field)}
				inputType="number"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{:else if field.type === 'signature' || field.type === 'witness_signature'}
		<label class="form-control w-full max-w-md" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<WashInputField
				id={fieldId(field)}
				className="input-sm font-serif italic"
				placeholder={field.type === 'witness_signature'
					? msg.clinical_form_witness()
					: msg.clinical_form_signature_capture()}
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{:else if field.type === 'signature_datetime'}
		<label class="form-control w-full max-w-md" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">{field.label}</span>
			<WashInputField
				id={fieldId(field)}
				inputType="datetime-local"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{:else if field.type === 'datetime'}
		<label class="form-control w-full max-w-md" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">{field.label}</span>
			<WashInputField
				id={fieldId(field)}
				inputType="datetime-local"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{:else if field.type !== 'section'}
		<label class="form-control w-full max-w-md" for={fieldId(field)}>
			<span class="label-text mb-1 text-sm">
				{field.label}{#if field.required}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<WashInputField
				id={fieldId(field)}
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) => setStr(field.id, e.currentTarget.value)}
			/>
		</label>
	{/if}
{/snippet}

<div class="flex flex-col gap-4">
	{#each schema.sections as field (field.id)}
		{#if field.type === 'section' && field.sectionFields?.length}
			<fieldset class="border-base-300 rounded-box border p-3">
				<legend class="text-primary px-1 text-sm font-bold">{field.label}</legend>
				<div class="mt-2 flex flex-col gap-3">
					{#each field.sectionFields as sub (sub.id)}
						{@render fieldControl(sub)}
					{/each}
				</div>
			</fieldset>
		{:else}
			{@render fieldControl(field)}
		{/if}
	{/each}
</div>
