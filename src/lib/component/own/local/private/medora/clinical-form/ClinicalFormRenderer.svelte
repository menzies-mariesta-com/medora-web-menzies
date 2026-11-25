<script lang="ts">
	import type {
		ClinicalFormFieldDef,
		ClinicalFormTemplateSchema
	} from '$lib/model/type/medora/clinical-form.type';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		schema,
		values = $bindable({} as Record<string, unknown>),
		readOnly = false,
		idPrefix = 'cfe',
		className = 'flex flex-col gap-4'
	}: {
		schema: ClinicalFormTemplateSchema;
		values?: Record<string, unknown>;
		readOnly?: boolean;
		idPrefix?: string;
		/** Root layout; pass a grid to place fields in columns. */
		className?: string;
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

	/** Rows for a `table` field; tolerates a missing or malformed value. */
	function tableRows(
		field: ClinicalFormFieldDef
	): Record<string, string>[] {
		const raw = values[field.id];
		if (!Array.isArray(raw)) return [];
		return raw.filter(
			(row): row is Record<string, string> =>
				typeof row === 'object' && row !== null
		);
	}

	function ensureTableRows(
		fieldId: string
	): Record<string, string>[] {
		if (!Array.isArray(values[fieldId])) values[fieldId] = [];
		return values[fieldId] as Record<string, string>[];
	}

	function addTableRow(fieldId: string) {
		ensureTableRows(fieldId).push({});
		values = { ...values };
	}

	function removeTableRow(fieldId: string, index: number) {
		ensureTableRows(fieldId).splice(index, 1);
		values = { ...values };
	}

	function setTableCell(
		fieldId: string,
		index: number,
		columnId: string,
		cell: string
	) {
		const rows = ensureTableRows(fieldId);
		if (!rows[index]) rows[index] = {};
		rows[index][columnId] = cell;
		values = { ...values };
	}
</script>

{#snippet fieldControl(field: ClinicalFormFieldDef)}
	{#if field.type === 'boolean'}
		<label
			class="label cursor-pointer justify-start gap-2"
			for={fieldId(field)}
		>
			<input
				id={fieldId(field)}
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={boolVal(field.id)}
				disabled={readOnly}
				onchange={(e) =>
					setBool(
						field.id,
						(e.currentTarget as HTMLInputElement).checked
					)}
			/>
			<span class="text-sm">
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</span>
		</label>
	{:else if field.type === 'enum'}
		<div class="flex w-full max-w-md flex-col gap-1">
			<label
				class="label-ink mb-1 block text-sm"
				for={fieldId(field)}
			>
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</label>
			<WashSelect
				id={fieldId(field)}
				className="select-sm w-full"
				placeholder={msg.periop_form_select()}
				options={enumOptions(field)}
				value={strVal(field.id)}
				onChange={(v) => setStr(field.id, v ?? '')}
				disabled={readOnly}
			/>
		</div>
	{:else if field.type === 'textarea'}
		<div class="flex w-full flex-col gap-1">
			<label
				class="label-ink mb-1 block text-sm"
				for={fieldId(field)}
			>
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</label>
			<WashTextarea
				id={fieldId(field)}
				className="textarea-sm w-full"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{:else if field.type === 'number'}
		<div class="flex w-full max-w-xs flex-col gap-1">
			<label
				class="label-ink mb-1 block text-sm"
				for={fieldId(field)}
			>
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</label>
			<WashInputField
				id={fieldId(field)}
				inputType="number"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{:else if field.type === 'signature' || field.type === 'witness_signature'}
		<div class="flex w-full max-w-md flex-col gap-1">
			<label
				class="label-ink mb-1 block text-sm"
				for={fieldId(field)}
			>
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</label>
			<WashInputField
				id={fieldId(field)}
				className="input-sm font-serif italic"
				inputPlaceholderText={field.type === 'witness_signature'
					? msg.clinical_form_witness()
					: msg.clinical_form_signature_capture()}
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{:else if field.type === 'signature_datetime'}
		<div class="flex w-full max-w-md flex-col gap-1">
			<label class="label-ink mb-1 block text-sm" for={fieldId(field)}
				>{field.label}</label
			>
			<WashInputField
				id={fieldId(field)}
				inputType="datetime-local"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{:else if field.type === 'datetime'}
		<div class="flex w-full max-w-md flex-col gap-1">
			<label class="label-ink mb-1 block text-sm" for={fieldId(field)}
				>{field.label}</label
			>
			<WashInputField
				id={fieldId(field)}
				inputType="datetime-local"
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{:else if field.type === 'table'}
		<div class="flex w-full flex-col gap-2">
			<span class="label-ink text-sm">
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</span>
			<table class="table-sm table w-full">
				<thead>
					<tr>
						{#each field.columns ?? [] as col (col.id)}
							<th class="text-xs font-semibold">{col.label}</th>
						{/each}
						<th class="w-10"><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each tableRows(field) as row, rowIndex (rowIndex)}
						<tr>
							{#each field.columns ?? [] as col (col.id)}
								<td>
									{#if col.type === 'enum'}
										<WashSelect
											className="select-sm w-full"
											placeholder={msg.periop_form_select()}
											options={(col.options ?? []).map((o) => ({
												value: o.value,
												label: o.label
											}))}
											value={row[col.id] ?? ''}
											disabled={readOnly}
											onChange={(v) =>
												setTableCell(
													field.id,
													rowIndex,
													col.id,
													v ?? ''
												)}
										/>
									{:else}
										<WashInputField
											className="input-sm w-full"
											inputType={col.type === 'number'
												? 'number'
												: 'text'}
											disabled={readOnly}
											value={row[col.id] ?? ''}
											oninput={(e) =>
												setTableCell(
													field.id,
													rowIndex,
													col.id,
													(e.currentTarget as HTMLInputElement).value
												)}
										/>
									{/if}
								</td>
							{/each}
							<td>
								{#if !readOnly}
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										aria-label={`${msg.clinical_form_remove_row?.() ?? 'Remove row'} ${rowIndex + 1}`}
										onclick={() => removeTableRow(field.id, rowIndex)}
									>
										<LucideTrash2 className="size-4" />
									</button>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td
								colspan={(field.columns?.length ?? 0) + 1}
								class="text-xs opacity-70"
							>
								{m.clinical_form_no_rows?.() ?? 'No rows yet.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if !readOnly}
				<button
					type="button"
					class="btn btn-outline btn-xs self-start"
					onclick={() => addTableRow(field.id)}
				>
					<LucidePlus className="size-4" />
					{m.clinical_form_add_row?.() ?? 'Add row'}
				</button>
			{/if}
		</div>
	{:else if field.type !== 'section'}
		<div class="flex w-full max-w-md flex-col gap-1">
			<label
				class="label-ink mb-1 block text-sm"
				for={fieldId(field)}
			>
				{field.label}{#if field.required}<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>{/if}
			</label>
			<WashInputField
				id={fieldId(field)}
				className="input-sm"
				disabled={readOnly}
				value={strVal(field.id)}
				oninput={(e) =>
					setStr(
						field.id,
						(e.currentTarget as HTMLInputElement).value
					)}
			/>
		</div>
	{/if}
{/snippet}

<div class={className}>
	{#each schema.sections as field (field.id)}
		{#if field.type === 'section' && field.sectionFields?.length}
			<fieldset class="rounded-box border border-base-300 p-3">
				<legend class="px-1 text-sm font-bold text-primary"
					>{field.label}</legend
				>
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
